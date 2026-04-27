// Equity Brain — claude-generate-pitch
// Usa Claude Sonnet 4 para gerar pitch comercial PERSONALIZADO (2-3 parágrafos)
// para o BDR usar em call/whatsapp/email.
// Auth: admin OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const COST_INPUT_PER_MTOK = 3;
const COST_OUTPUT_PER_MTOK = 15;

const SYSTEM_PROMPT = `Você é um BDR sênior da Vispe Capital, especialista em abordagem consultiva para fundadores de PMEs.
Seu trabalho NÃO é vender consultoria — é gerar conversa estratégica.
Use a fórmula:
1) Frase de credibilidade (mostra que você sabe do mercado/região)
2) Insight provocativo (algo que o fundador talvez não tenha pensado)
3) Convite para conversa (sem pressão de venda)

Tom: respeitoso, direto, executivo. Nada de "espero que esteja bem". Nada de jargão.
Adapte ao canal: call (frase de abertura curta), whatsapp (3-5 linhas, cordial), email (assunto + 4 parágrafos).

RESPONDA APENAS EM JSON:
{"pitch":"texto completo do pitch","abertura_curta":"primeira frase ≤ 20 palavras","subject":"se canal=email"}`;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized", userId: null as string | null };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub ?? null;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true, userId: null };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized", userId: null };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only", userId };
  return { ok: true, userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t0 = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cnpj: string | undefined = body.cnpj;
    const buyer_id: string | undefined = body.buyer_id;
    const channel: "call" | "whatsapp" | "email" = body.channel ?? "call";
    const force_refresh: boolean = !!body.force_refresh;
    if (!cnpj) {
      return new Response(JSON.stringify({ error: "cnpj required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Empresa
    const { data: company, error: cErr } = await supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("*")
      .eq("cnpj", cnpj)
      .maybeSingle();
    if (cErr || !company) {
      return new Response(JSON.stringify({ error: "company not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Match alvo (específico por buyer_id ou top match)
    let matchQuery = supabase
      .schema("equity_brain" as any)
      .from("matches_enriched")
      .select("*")
      .eq("cnpj", cnpj)
      .order("match_score", { ascending: false })
      .limit(1);
    if (buyer_id) matchQuery = supabase
      .schema("equity_brain" as any)
      .from("matches_enriched")
      .select("*")
      .eq("cnpj", cnpj)
      .eq("buyer_id", buyer_id)
      .limit(1);

    const { data: matchRows } = await matchQuery;
    const targetMatch = matchRows?.[0];
    if (!targetMatch) {
      return new Response(JSON.stringify({ error: "no match found for this cnpj" + (buyer_id ? "/buyer" : "") }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Skip se já tem pitch e não force
    const { data: existingOpp } = await supabase
      .schema("equity_brain" as any)
      .from("opportunities_ready")
      .select("ai_pitch")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (!force_refresh && !buyer_id && existingOpp?.ai_pitch) {
      return new Response(JSON.stringify({
        skipped: true,
        cnpj,
        pitch: existingOpp.ai_pitch,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4) Prompt
    const userPrompt = `Empresa-alvo:
- Razão social: ${company.razao_social}
- Setor: ${company.setor_ma} (${company.cnae_descricao ?? ""})
- Localização: ${company.municipio}/${company.uf}
- Idade: ${company.idade_empresa ?? "?"} anos
- Sócios: ${company.qtd_socios ?? "?"}
- Score M&A: ${company.ma_score ?? 0}/100, Sucessão: ${company.sucessao_score ?? 0}/100

Comprador estratégico:
- Nome: ${targetMatch.buyer_nome} (${targetMatch.buyer_tipo})
- Tese: "${targetMatch.thesis_name}" — ${targetMatch.thesis_description ?? ""}
- Match score: ${targetMatch.match_score}/100
- Setores de interesse: ${(targetMatch.setores_interesse ?? []).join(", ")}
- Ticket: R$ ${Number(targetMatch.ticket_min ?? 0).toLocaleString("pt-BR")} – R$ ${Number(targetMatch.ticket_max ?? 0).toLocaleString("pt-BR")}

Justificativas do match:
${(targetMatch.reasons ?? []).map((r: any) => `- ${r.text}`).join("\n") || "- (sem detalhes)"}

Canal: ${channel}

Gere o pitch no formato JSON pedido.`;

    // 5) Claude
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", claudeResp.status, errText);
      await supabase.schema("equity_brain" as any).from("ai_runs").insert({
        function_name: "generate_pitch",
        cnpj,
        buyer_id: targetMatch.buyer_id,
        match_id: targetMatch.id,
        model: MODEL,
        prompt_input: { user: userPrompt, channel },
        status: "error",
        error_message: `${claudeResp.status}: ${errText}`,
        latency_ms: Date.now() - t0,
        triggered_by: auth.userId,
      });
      return new Response(JSON.stringify({ error: "Claude API error", status: claudeResp.status, detail: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeJson = await claudeResp.json();
    const text: string = claudeJson.content?.[0]?.text ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      parsed = null;
    }

    const tokensIn = claudeJson.usage?.input_tokens ?? 0;
    const tokensOut = claudeJson.usage?.output_tokens ?? 0;
    const costUsd = (tokensIn * COST_INPUT_PER_MTOK / 1_000_000) + (tokensOut * COST_OUTPUT_PER_MTOK / 1_000_000);

    // 6) Updates
    if (parsed?.pitch) {
      // opportunities_ready: sempre atualiza ai_pitch
      await supabase
        .schema("equity_brain" as any)
        .from("opportunities_ready")
        .update({ ai_pitch: parsed.pitch })
        .eq("cnpj", cnpj);

      // matches: atualiza só o match alvo
      await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .update({ ai_pitch: parsed.pitch })
        .eq("id", targetMatch.id);
    }

    // 7) Log
    await supabase.schema("equity_brain" as any).from("ai_runs").insert({
      function_name: "generate_pitch",
      cnpj,
      buyer_id: targetMatch.buyer_id,
      match_id: targetMatch.id,
      model: MODEL,
      prompt_input: { user: userPrompt, channel },
      raw_response: text,
      parsed_output: parsed,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
      status: parsed?.pitch ? "success" : "partial",
      triggered_by: auth.userId,
    });

    return new Response(JSON.stringify({
      cnpj,
      buyer_id: targetMatch.buyer_id,
      channel,
      parsed,
      tokens: { input: tokensIn, output: tokensOut },
      cost_usd: costUsd,
      latency_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("claude-generate-pitch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
