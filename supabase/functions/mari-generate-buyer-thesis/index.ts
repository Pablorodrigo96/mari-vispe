// Equity Brain — mari-generate-buyer-thesis (Fase E2)
// Gera tese individualizada (até 600 chars) por match usando Lovable AI Gateway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getUserAndAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, isAdmin: false };
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { userId: null, isAdmin: true, isService: true };
  const sUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await sUser.auth.getClaims(token);
  const userId = claims?.claims?.sub ?? null;
  if (!userId) return { userId: null, isAdmin: false };
  const sa = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: r } = await sa.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "advisor"]);
  const isAdmin = (r ?? []).some((x: any) => x.role === "admin");
  const isAdvisor = (r ?? []).some((x: any) => x.role === "advisor");
  return { userId, isAdmin, isAdvisor };
}

async function generateOne(supabase: any, matchId: string, apiKey: string) {
  const { data: match, error } = await supabase
    .schema("equity_brain" as any).from("matches")
    .select("id, cnpj, buyer_id, sav_score, sav_breakdown")
    .eq("id", matchId).maybeSingle();
  if (error) throw error;
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
    .eq("setor", company.setor_ma)
    .order("data_anuncio", { ascending: false }).limit(3);

  const breakdown = match.sav_breakdown ?? {};
  const factors = ["sinergia_custo","sinergia_receita","eliminacao_competitiva","geografia","custo_oportunidade","encaixe_estrategico"]
    .map((k) => [k, breakdown[k]] as const)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3);

  const fmtMM = (v: any) => v ? (Number(v) / 1e6).toFixed(1) + "MM" : "n/d";

  const prompt = `Você é a Mari, assistente de M&A da Vispe Capital. Gere uma TESE INDIVIDUALIZADA de até 600 caracteres que o advisor usará como argumento comercial específico ao apresentar este deal a este comprador.

EMPRESA-ALVO:
- ${company.razao_social}, setor ${company.setor_ma}/${company.subsetor_ma || ""}
- ${company.uf} ${company.municipio || ""}
- Faturamento estimado: R$ ${fmtMM(company.faturamento_estimado)}
- EBITDA estimado: R$ ${fmtMM(company.ebitda_estimado)}

COMPRADOR:
- ${buyer.nome}
- Tipo Vispe: ${buyer.tipo_comprador ?? "n/d"} (${tax?.descricao ?? ""})
- Argumento padrão pra esse tipo: "${tax?.argumento_comercial_padrao ?? ""}"

SCORE DE ASSIMETRIA (SAV): ${match.sav_score ?? "n/d"}/100
TOP 3 FATORES (mais altos):
${factors.map(([k, v]) => `- ${k}: ${v}/100`).join("\n")}

DEALS COMPARÁVEIS RECENTES (Vispe Database):
${(comparaveis ?? []).length > 0
  ? (comparaveis ?? []).map((d: any) => `- ${d.alvo_nome}: ${d.multiplo_ev_ebitda ?? "n/d"}x EBITDA, fase ${d.fase_ciclo_setorial ?? "n/d"}`).join("\n")
  : "(sem comparáveis na base atual)"}

REGRAS:
- Tom direto e profissional (sem firulas, sem markdown)
- Primeira pessoa do plural ("apresentamos...", "este ativo...")
- Foque no ARGUMENTO ESPECÍFICO baseado nos top 3 fatores e tipo do comprador
- Máximo 600 caracteres
- Sem repetir nome da empresa mais de 1x
- Sem clichês ("oportunidade única", "investimento sólido")
- Termine com uma chamada à ação (próximo passo)

Tese:`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é a Mari, escreve teses comerciais de M&A em PT-BR, direto e sem clichês." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!aiResp.ok) {
    const t = await aiResp.text();
    if (aiResp.status === 429) throw new Error("RATE_LIMIT");
    if (aiResp.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI error ${aiResp.status}: ${t.slice(0, 200)}`);
  }
  const body = await aiResp.json();
  const text: string = (body?.choices?.[0]?.message?.content ?? "").trim();
  const thesis = text.slice(0, 600);

  await supabase.schema("equity_brain" as any).from("matches").update({
    thesis_text: thesis,
    thesis_generated_at: new Date().toISOString(),
  }).eq("id", matchId);

  return thesis;
}

serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const auth = await getUserAndAdmin(req);
    if (!auth.userId && !auth.isAdmin && !(auth as any).isService) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    if (body.match_id) {
      const thesis = await generateOne(supabase, body.match_id, apiKey);
      return new Response(JSON.stringify({ ok: true, thesis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.batch) {
      if (!auth.isAdmin && !(auth as any).isService) {
        return new Response(JSON.stringify({ error: "Forbidden: batch admin-only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const limit = Math.min(Number(body.limit ?? 50), 100);
      const { data: matches } = await supabase.schema("equity_brain" as any).from("matches")
        .select("id").eq("is_current", true)
        .not("sav_score", "is", null)
        .is("thesis_text", null)
        .order("sav_score", { ascending: false }).limit(limit);
      let success = 0, errors = 0;
      for (const m of matches ?? []) {
        try { await generateOne(supabase, (m as any).id, apiKey); success++; await new Promise(r => setTimeout(r, 1000)); }
        catch (e) { errors++; console.error("thesis err", e); }
      }
      return new Response(JSON.stringify({ processed: matches?.length ?? 0, success, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "match_id or batch:true required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    const status = msg === "RATE_LIMIT" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
    console.error("mari-generate-buyer-thesis error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "mari-generate-buyer-thesis" }));
