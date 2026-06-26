// Auto-gera 5 stories visuais por empresa (token) com fotos IA + overlays de teaser.
// Idempotente: pula se já existe set válido (auto_generated, expires_at > now).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "company-stories";
const MODEL = "openai/gpt-image-1-mini";

const SECTOR_CUES: Record<string, string> = {
  alimentacao: "artisan bakery, warm golden light, fresh bread, cozy ambiance",
  restaurantes: "vibrant brazilian restaurant, plated food, warm atmosphere",
  clinicas: "modern medical clinic, clean white interior, friendly staff",
  agro: "brazilian farm fields, sunrise, crops, tractor, rural prosperity",
  academias: "modern gym interior, equipment, energetic athletes",
  industria: "industrial factory floor, machinery, workers in safety gear",
  construcao: "construction site, scaffolding, blueprints, workers",
  franquias: "retail storefront, customers shopping, bright signage",
  tecnologia: "tech startup office, laptops, screens with code, modern workspace",
  educacao: "school classroom, students learning, books, engaged teacher",
  logistica: "warehouse logistics, trucks, packages, organized shelves",
};

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);
}

function buildSlides(token: any, listing: any) {
  const sector = (listing?.category || token.metadata?.sector || "tecnologia").toLowerCase();
  const cityLine = [listing?.city, listing?.state].filter(Boolean).join("/") || "Brasil";
  const founded = listing?.foundation_year ? `Fundada em ${listing.foundation_year}` : "Empresa brasileira";
  const monthRev = listing?.annual_revenue ? listing.annual_revenue / 12 : 0;
  const raised = token.amount_raised || 0;
  const goal = token.total_offering_amount || 0;
  const pct = goal ? Math.round((raised / goal) * 100) : 0;
  const minTicket = token.min_ticket || 50;
  const cue = SECTOR_CUES[sector] || `${sector} business in Brazil, professional photography`;

  return [
    {
      prompt: `Editorial vertical photo of ${cue}. Storefront / exterior. Hyperreal, natural light, shot on 35mm, cinematic, no text.`,
      overlay: {
        kpi_label: "CIDADE",
        kpi_value: cityLine,
        headline: token.name,
        sub: founded + (listing?.user_id ? "" : ""),
      },
    },
    {
      prompt: `Editorial vertical photo of ${cue}. Close-up of the product / service in action. Warm tones, depth of field, no text.`,
      overlay: {
        kpi_label: "SETOR",
        kpi_value: (listing?.category || "Negócio brasileiro").toString().toUpperCase(),
        headline: listing?.description?.split(".")[0]?.slice(0, 80) || `O que ${token.name} faz`,
        sub: cityLine,
      },
    },
    {
      prompt: `Editorial vertical photo of ${cue}. Team or happy customers. Authentic, candid, soft natural light, no text.`,
      overlay: {
        kpi_label: "RECEITA",
        kpi_value: monthRev ? `${fmtBRL(monthRev)}/mês` : "Em crescimento",
        delta: monthRev ? "+41%" : undefined,
        headline: monthRev ? "Tração consistente mês a mês" : `${token.name} acelerando`,
        sub: "Receita validada · cliente recorrente",
      },
    },
    {
      prompt: `Editorial vertical photo of ${cue}. Behind-the-scenes founder moment, focused work, hopeful tone, no text.`,
      overlay: {
        kpi_label: "RODADA",
        kpi_value: goal ? `${fmtBRL(raised)} / ${fmtBRL(goal)}` : "Rodada aberta",
        delta: pct ? `${pct}% captado` : undefined,
        headline: "Rodada aberta agora",
        sub: `Ticket mínimo ${fmtBRL(minTicket)} · CVM 88`,
      },
    },
    {
      prompt: `Editorial vertical photo of ${cue}. Wide shot suggesting growth, expansion, new horizon, hopeful and cinematic, no text.`,
      overlay: {
        kpi_label: "PRÓXIMO PASSO",
        kpi_value: "Expansão",
        headline: `Aporte vai pra próxima fase de ${token.name}`,
        sub: "Conheça e invista a partir de R$ 50",
      },
    },
  ];
}

async function genImage(prompt: string): Promise<Uint8Array> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: "1024x1536",
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`image_gen_failed_${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("image_gen_no_b64");
  // decode base64
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token_id, force } = await req.json().catch(() => ({}));
    if (!token_id) return json({ error: "token_id_required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: token } = await admin.from("tokens").select("*").eq("id", token_id).maybeSingle();
    if (!token) return json({ error: "token_not_found" }, 404);

    let listing: any = null;
    if (token.listing_id) {
      const { data: l } = await admin.from("listings").select("*").eq("id", token.listing_id).maybeSingle();
      listing = l;
    }

    // Idempotência
    if (!force) {
      const { data: existing } = await admin
        .from("company_stories")
        .select("id")
        .eq("token_id", token_id)
        .eq("source", "auto_generated")
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (existing?.length) return json({ skipped: true, reason: "already_active" });
    }
    // Sempre limpa auto antigos (expirados ou não) pra evitar colisão de unique (token_id, slide_index)
    await admin.from("company_stories").delete().eq("token_id", token_id).eq("source", "auto_generated");

    const slides = buildSlides(token, listing);
    const inserts: any[] = [];

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const bytes = await genImage(s.prompt);
      const path = `auto/${token_id}/${Date.now()}-${i}.png`;
      const up = await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: "image/png", upsert: true,
      });
      if (up.error) throw new Error(`upload_failed: ${up.error.message}`);
      // Bucket é privado — gera signed URL válida por 25h (matching expires_at + folga)
      const { data: signed, error: sErr } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 25);
      if (sErr || !signed?.signedUrl) throw new Error(`sign_failed: ${sErr?.message}`);
      inserts.push({
        token_id,
        author_id: null,
        slide_order: i,
        slide_index: i,
        media_type: "image",
        media_url: signed.signedUrl,
        caption: s.overlay.headline,
        source: "auto_generated",
        overlay: s.overlay,
      });
    }

    const { error: insErr } = await admin
      .from("company_stories")
      .upsert(inserts, { onConflict: "token_id,slide_index" });
    if (insErr) throw new Error(`insert_failed: ${insErr.message}`);

    return json({ ok: true, generated: inserts.length });
  } catch (e: any) {
    console.error("[generate-company-stories]", e);
    return json({ error: e.message || String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
