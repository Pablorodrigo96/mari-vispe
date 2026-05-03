// Parallel wrapper for mari-generate-buyer-thesis (groups of 10).
// Admin-only. Filtra matches is_current AND sav_score IS NOT NULL AND thesis_text IS NULL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { trackedAIFetch } from "../_shared/apiTrack.ts";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function authorize(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true, supabase: createClient(url, serviceKey) };
  if (!token) return { ok: false, status: 401 };
  const sUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await sUser.auth.getUser();
  if (!u?.user) return { ok: false, status: 401 };
  const sa = createClient(url, serviceKey);
  const { data: r } = await sa.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  if (!r) return { ok: false, status: 403 };
  return { ok: true, supabase: sa };
}

async function generateOne(supabase: any, matchId: string, apiKey: string) {
  const { data: match } = await supabase.schema("equity_brain" as any).from("matches")
    .select("id, cnpj, buyer_id, sav_score, sav_breakdown").eq("id", matchId).maybeSingle();
  if (!match) throw new Error("match not found");
  const [{ data: company }, { data: buyer }] = await Promise.all([
    supabase.schema("equity_brain" as any).from("companies")
      .select("razao_social, setor_ma, subsetor_ma, uf, municipio, faturamento_estimado, ebitda_estimado")
      .eq("cnpj", match.cnpj).maybeSingle(),
    supabase.schema("equity_brain" as any).from("buyers")
      .select("nome, tipo_comprador").eq("id", match.buyer_id).maybeSingle(),
  ]);
  if (!company || !buyer) throw new Error("company or buyer missing");
  const { data: tax } = buyer.tipo_comprador ? await supabase
    .schema("equity_brain" as any).from("taxonomia_compradores")
    .select("descricao, argumento_comercial_padrao").eq("tipo", buyer.tipo_comprador).maybeSingle() : { data: null };
  const { data: comparaveis } = await supabase
    .schema("equity_brain" as any).from("benchmark_transactions")
    .select("alvo_nome, multiplo_ev_ebitda, fase_ciclo_setorial")
    .eq("setor", company.setor_ma).order("data_anuncio", { ascending: false }).limit(3);
  const breakdown = match.sav_breakdown ?? {};
  const factors = ["sinergia_custo","sinergia_receita","eliminacao_competitiva","geografia","custo_oportunidade","encaixe_estrategico"]
    .map((k) => [k, breakdown[k]] as const).filter(([, v]) => typeof v === "number")
    .sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
  const fmtMM = (v: any) => v ? (Number(v) / 1e6).toFixed(1) + "MM" : "n/d";
  const prompt = `Você é a Mari, assistente de M&A da Vispe Capital. Gere uma TESE INDIVIDUALIZADA de até 600 caracteres.

EMPRESA: ${company.razao_social}, ${company.setor_ma}/${company.subsetor_ma||""}, ${company.uf} ${company.municipio||""}
Faturamento: R$ ${fmtMM(company.faturamento_estimado)} | EBITDA: R$ ${fmtMM(company.ebitda_estimado)}

COMPRADOR: ${buyer.nome} | Tipo: ${buyer.tipo_comprador??"n/d"} (${tax?.descricao??""})
Argumento padrão: "${tax?.argumento_comercial_padrao??""}"

SAV: ${match.sav_score??"n/d"}/100 | TOP 3:
${factors.map(([k,v])=>`- ${k}: ${v}/100`).join("\n")}

COMPARÁVEIS: ${(comparaveis??[]).map((d:any)=>`${d.alvo_nome}: ${d.multiplo_ev_ebitda??"n/d"}x`).join("; ") || "(sem)"}

Tom direto, primeira pessoa plural, foco no top 3, máximo 600 chars, termine com CTA. Sem markdown.

Tese:`;
  const aiResp = await trackedAIFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é a Mari, escreve teses comerciais de M&A em PT-BR, direto e sem clichês." },
        { role: "user", content: prompt },
      ],
    }),
  }, { function_name: "mari-buyer-thesis-batch-parallel" });
  if (!aiResp.ok) throw new Error(`AI ${aiResp.status}`);
  const body = await aiResp.json();
  const thesis = (body?.choices?.[0]?.message?.content ?? "").trim().slice(0, 600);
  await supabase.schema("equity_brain" as any).from("matches")
    .update({ thesis_text: thesis, thesis_generated_at: new Date().toISOString() })
    .eq("id", matchId);
  return thesis;
}

serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await authorize(req);
    if (!auth.ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: auth.status ?? 401, headers: corsHeaders });
    const supabase = auth.supabase!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 100), 1000);
    const concurrency = Math.min(Number(body.concurrency ?? 10), 15);

    const { data: matches } = await supabase.schema("equity_brain" as any).from("matches")
      .select("id").eq("is_current", true).not("sav_score", "is", null).is("thesis_text", null)
      .order("sav_score", { ascending: false }).limit(limit);
    const ids = (matches ?? []).map((m: any) => m.id);
    let success = 0, errors = 0, processed = 0;
    const errSamples: string[] = [];
    let aborted = false;
    for (let i = 0; i < ids.length; i += concurrency) {
      const slice = ids.slice(i, i + concurrency);
      const results = await Promise.allSettled(slice.map((id) => generateOne(supabase, id, apiKey)));
      for (const r of results) {
        processed++;
        if (r.status === "fulfilled") success++;
        else { errors++; if (errSamples.length < 5) errSamples.push(String(r.reason).slice(0, 200)); }
      }
      if (processed >= 20 && errors / processed > 0.30) {
        aborted = true;
        console.error(`thesis batch aborted at ${processed}: ${errors} errors`);
        break;
      }
    }
    return new Response(JSON.stringify({ total: ids.length, processed, success, errors, aborted, error_samples: errSamples }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { name: "mari-buyer-thesis-batch-parallel" }));
