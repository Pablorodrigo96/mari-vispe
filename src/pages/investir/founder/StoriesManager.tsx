import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Link as LinkIcon, Trash2, Loader2, Instagram, Image as ImageIcon, Video } from "lucide-react";
import { z } from "zod";

type StoryRow = {
  id: string;
  token_id: string;
  slide_order: number;
  media_type: "image" | "video" | "instagram_embed";
  media_url: string;
  caption: string | null;
  source: string;
  source_url: string | null;
  published_at: string;
  expires_at: string;
};

const captionSchema = z.string().trim().max(200, "Máx. 200 caracteres").optional();
const IG_REGEX = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i;

function extractInstagramId(url: string): string | null {
  const m = url.match(IG_REGEX);
  return m?.[1] ?? null;
}

export default function StoriesManager() {
  const { symbol = "" } = useParams();
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(symbol);
  const [stories, setStories] = useState<StoryRow[]>([]);

  // form state
  const [mode, setMode] = useState<"upload" | "instagram">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [igUrl, setIgUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);

  const reload = useCallback(async (tId: string) => {
    const { data } = await supabase
      .from("company_stories")
      .select("*")
      .eq("token_id", tId)
      .gt("expires_at", new Date().toISOString())
      .order("slide_order", { ascending: true });
    setStories((data as StoryRow[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate(`/investir/auth?redirect=/investir/empresa/${symbol}/stories`); return; }
      setAuthed(true);

      const { data: tk } = await supabase
        .from("tokens")
        .select("id, name, listing_id")
        .eq("symbol", symbol)
        .maybeSingle();
      if (!tk) { setLoading(false); return; }
      setTokenId(tk.id);
      setCompanyName(tk.name || symbol);

      const { data: can } = await supabase.rpc("can_manage_company_stories", {
        _token_id: tk.id, _user_id: u.user.id,
      });
      setCanManage(!!can);
      await reload(tk.id);
      setLoading(false);
    })();
  }, [symbol, navigate, reload]);

  async function handlePublish() {
    if (!tokenId) return;
    const capRes = captionSchema.safeParse(caption || undefined);
    if (!capRes.success) { toast.error(capRes.error.issues[0].message); return; }

    setPublishing(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");

      let media_url = "";
      let media_type: "image" | "video" | "instagram_embed" = "image";
      let source: "manual_upload" | "instagram_link" = "manual_upload";
      let source_url: string | null = null;

      if (mode === "instagram") {
        const id = extractInstagramId(igUrl.trim());
        if (!id) { toast.error("Cole o link de um post ou reel público do Instagram (/p/ ou /reel/)."); setPublishing(false); return; }
        media_url = `https://www.instagram.com/p/${id}/embed/captioned`;
        media_type = "instagram_embed";
        source = "instagram_link";
        source_url = igUrl.trim();
      } else {
        if (!file) { toast.error("Selecione uma imagem ou vídeo."); setPublishing(false); return; }
        if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo maior que 10MB."); setPublishing(false); return; }
        const isVideo = file.type.startsWith("video/");
        media_type = isVideo ? "video" : "image";
        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${u.user.id}/${tokenId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("company-stories").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("company-stories").createSignedUrl(path, 60 * 60 * 24 * 7);
        if (!signed?.signedUrl) throw new Error("Falha ao gerar URL");
        media_url = signed.signedUrl;
      }

      const order = stories.length;
      const { error: insErr } = await supabase.from("company_stories").insert({
        token_id: tokenId, author_id: u.user.id, slide_order: order,
        media_type, media_url, caption: caption.trim() || null,
        source, source_url,
      });
      if (insErr) throw insErr;

      toast.success("Story publicado! Fica no ar por 24h.");
      setFile(null); setIgUrl(""); setCaption("");
      await reload(tokenId);
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este slide?")) return;
    const { error } = await supabase.from("company_stories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setStories((prev) => prev.filter((s) => s.id !== id));
    toast.success("Removido");
  }

  return (
    <InvestirShell authed={authed} hideFooter>
      <section className="max-w-[800px] mx-auto px-5 md:px-6 py-6 md:py-10">
        <Link to={`/investir/empresa/${symbol}`} className="inline-flex items-center gap-1.5 text-bone/65 hover:text-volt text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para {companyName}
        </Link>

        <h1 className="text-2xl md:text-3xl font-semibold text-bone">
          Stories de <span className="text-volt">{companyName}</span>
        </h1>
        <p className="text-bone/65 text-sm mt-1.5">
          Publique slides que aparecem nas bolinhas do topo do feed. Cada slide fica no ar por 24h, igual ao Instagram.
        </p>

        {loading ? (
          <div className="mt-10 grid place-items-center text-bone/55">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !canManage ? (
          <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-bone/80">
            Você não tem permissão para gerenciar os stories desta empresa. Apenas o fundador (dono do anúncio) ou um advisor/admin pode publicar aqui.
          </div>
        ) : (
          <>
            {/* Ativos */}
            <div className="mt-8">
              <h2 className="text-bone font-semibold text-sm uppercase tracking-wider mb-3">
                Slides ativos ({stories.length})
              </h2>
              {stories.length === 0 ? (
                <div className="text-bone/55 text-sm border border-dashed border-bone/15 rounded-2xl p-6 text-center">
                  Nenhum story ativo. Publique o primeiro abaixo.
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {stories.map((s) => {
                    const hoursLeft = Math.max(0, Math.round((+new Date(s.expires_at) - Date.now()) / 3_600_000));
                    return (
                      <li key={s.id} className="relative group rounded-xl overflow-hidden border border-bone/10 bg-graphite/40 aspect-[9/16]">
                        {s.media_type === "video" ? (
                          <video src={s.media_url} className="w-full h-full object-cover" muted />
                        ) : s.media_type === "instagram_embed" ? (
                          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-pink-500/20 to-amber-500/20">
                            <Instagram className="w-10 h-10 text-pink-300" />
                          </div>
                        ) : (
                          <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/85 to-transparent">
                          <div className="text-[10px] text-volt">expira em {hoursLeft}h</div>
                          {s.caption && <div className="text-white text-xs truncate">{s.caption}</div>}
                        </div>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 text-white/85 hover:bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Novo slide */}
            <div className="mt-10 rounded-2xl border border-bone/10 bg-graphite/30 p-5">
              <h2 className="text-bone font-semibold text-sm uppercase tracking-wider mb-4">Adicionar novo slide</h2>

              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setMode("upload")}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "upload" ? "bg-volt text-carbon" : "bg-bone/5 text-bone/70 hover:text-bone"}`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" /> Imagem/Vídeo
                </button>
                <button
                  onClick={() => setMode("instagram")}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "instagram" ? "bg-volt text-carbon" : "bg-bone/5 text-bone/70 hover:text-bone"}`}
                >
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1.5" /> Link do Instagram
                </button>
              </div>

              {mode === "upload" ? (
                <label className="block border-2 border-dashed border-bone/20 rounded-xl p-6 text-center cursor-pointer hover:border-volt/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="text-bone text-sm inline-flex items-center gap-2">
                      {file.type.startsWith("video/") ? <Video className="w-4 h-4 text-volt" /> : <ImageIcon className="w-4 h-4 text-volt" />}
                      {file.name} <span className="text-bone/55">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                    </div>
                  ) : (
                    <div className="text-bone/65 text-sm">
                      Clique para escolher uma <strong className="text-bone">imagem ou vídeo</strong> (até 10MB).
                      <div className="text-xs text-bone/45 mt-1">Tira um print do seu story do Instagram e envia aqui.</div>
                    </div>
                  )}
                </label>
              ) : (
                <div>
                  <input
                    type="url"
                    value={igUrl}
                    onChange={(e) => setIgUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/XXXX/  ou  /reel/XXXX/"
                    className="w-full bg-carbon border border-bone/15 rounded-xl px-4 py-2.5 text-sm text-bone placeholder:text-bone/35 focus:border-volt outline-none"
                  />
                  <p className="text-xs text-bone/55 mt-2">
                    Cole o link de um <strong>post</strong> ou <strong>reel público</strong>. Stories do IG (que somem em 24h) não têm link público — use a aba "Imagem/Vídeo" para enviar um print.
                  </p>
                </div>
              )}

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legenda (opcional, máx 200 caracteres)"
                maxLength={200}
                className="mt-4 w-full bg-carbon border border-bone/15 rounded-xl px-4 py-2.5 text-sm text-bone placeholder:text-bone/35 focus:border-volt outline-none"
              />

              <button
                onClick={handlePublish}
                disabled={publishing || (mode === "upload" ? !file : !igUrl.trim())}
                className="mt-4 w-full bg-volt text-carbon font-semibold py-3 rounded-full text-sm hover:bg-volt/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando…</> : "Publicar story (24h)"}
              </button>
            </div>
          </>
        )}
      </section>
    </InvestirShell>
  );
}
