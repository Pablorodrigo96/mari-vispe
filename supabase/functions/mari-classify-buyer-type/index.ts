import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { trackedAIFetch } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_TYPES = [
  "estrategico_incumbente","estrategico_entrante","consolidador",
  "plataforma_pe","add_on_pe","fundo_financeiro","family_office",
  "search_fund","oportunista","eliminatorio","internacional",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const resp = await trackedAIFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  }, { function_name: "mari-classify-buyer-type" });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function classifyBuyer(admin: any, buyerId: string, taxonomia: any[]) {
  const { data: buyer, error: bErr } = await admin
    .schema("equity_brain").from("buyers").select("*").eq("id", buyerId).single();
  if (bErr || !buyer) return { error: "buyer_not_found" };

  const firstToken = (buyer.nome ?? "").split(/\s+/)[0] ?? "";
  const { data: historical } = await admin
    .schema("equity_brain").from("benchmark_transactions")
    .select("alvo_nome, setor, subsetor, multiplo_ev_ebitda, fase_ciclo_setorial, tipo_comprador")
    .ilike("comprador_nome", `%${firstToken}%`)
    .limit(10);

  const prompt = `
Você é analista sênior de M&A. Classifique este comprador num dos 11 tipos da taxonomia Vispe.

TAXONOMIA:
${taxonomia.map((t) => `- ${t.tipo}: ${t.descricao}`).join("\n")}

DADOS DO COMPRADOR:
- Nome: ${buyer.nome}
- Tipo simples atual: ${buyer.tipo ?? "n/d"}
- Vertical principal: ${buyer.vertical_principal ?? "n/d"}
- Deals últimos 12m: ${buyer.deals_last_12m ?? "n/d"}
- Total deals históricos: ${buyer.deals_realizados ?? "n/d"}
- PE sponsor: ${buyer.pe_sponsor_name ?? "nenhum"}
- Última captação: ${buyer.recent_capital_raise_brl ? "R$ " + (buyer.recent_capital_raise_brl/1e6).toFixed(0) + "MM" : "n/d"}
- Múltiplo médio pago recente: ${buyer.avg_multiple_paid_recent ?? "n/d"}
- Setores de interesse: ${(buyer.setores_interesse ?? []).join(", ") || "n/d"}
- UFs de interesse: ${(buyer.ufs_interesse ?? []).join(", ") || "n/d"}

DEALS HISTÓRICOS (Vispe Database):
${(historical ?? []).length > 0
  ? historical!.map((d: any) =>
      `- ${d.alvo_nome} (${d.setor}/${d.subsetor}) - ${d.multiplo_ev_ebitda}x EBITDA - fase ${d.fase_ciclo_setorial} - tipo: ${d.tipo_comprador}`
    ).join("\n")
  : "(sem deals históricos na base Vispe)"}

REGRAS:
- Se tem PE sponsor + faz add-ons frequentes → "add_on_pe"
- Se é fundo PE recém-captou + primeiro deal num setor → "plataforma_pe"
- Se faz 5+ aquisições no mesmo setor declaradamente → "consolidador"
- Se domina o setor e raramente sai dele → "estrategico_incumbente"
- Se está entrando num novo setor/região → "estrategico_entrante"
- Se é estrangeira → "internacional"
- Se foca em distressed → "oportunista"

Responda APENAS em JSON válido (sem markdown):
{"tipo": "consolidador", "confidence": 0.85, "reasoning": "Explicação em uma linha"}
`;

  let raw: string;
  try {
    raw = await callAI(prompt);
  } catch (e) {
    return { error: "ai_failed", detail: String(e) };
  }

  let classification: any;
  try {
    const cleaned = raw.trim().replace(/```json|```/g, "");
    classification = JSON.parse(cleaned);
  } catch {
    return { error: "parse_failed", raw: raw.slice(0, 200) };
  }

  if (!VALID_TYPES.includes(classification.tipo)) {
    return { error: "invalid_type", received: classification.tipo };
  }

  await admin.schema("equity_brain").from("buyers").update({
    tipo_comprador: classification.tipo,
    tipo_classified_at: new Date().toISOString(),
    tipo_classified_confidence: classification.confidence ?? null,
    tipo_classified_reasoning: classification.reasoning ?? null,
  }).eq("id", buyerId);

  return classification;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: taxonomia } = await admin
      .schema("equity_brain").from("taxonomia_compradores").select("*");

    const body = await req.json().catch(() => ({}));

    if (body.batch) {
      const limit = Math.min(Number(body.limit ?? 50), 200);
      const { data: buyers } = await admin
        .schema("equity_brain").from("buyers")
        .select("id")
        .is("tipo_comprador", null)
        .eq("is_synthetic", false)
        .limit(limit);

      let success = 0, errors = 0;
      const sample: any[] = [];
      for (const b of buyers ?? []) {
        try {
          const r = await classifyBuyer(admin, b.id, taxonomia ?? []);
          if ((r as any).error) errors++; else success++;
          if (sample.length < 5) sample.push({ id: b.id, ...r });
          await sleep(1000);
        } catch { errors++; }
      }

      try {
        await admin.schema("mari_ops").from("health_check").insert({
          check_name: "mari-classify-buyer-type",
          status: errors === 0 ? "success" : "warning",
          details: `Batch: ${success}/${(buyers ?? []).length} classificados, ${errors} erros`,
        });
      } catch (_) {}

      return new Response(
        JSON.stringify({ success, errors, total: (buyers ?? []).length, sample }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.buyer_id) {
      const r = await classifyBuyer(admin, body.buyer_id, taxonomia ?? []);
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "missing buyer_id or batch flag" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
