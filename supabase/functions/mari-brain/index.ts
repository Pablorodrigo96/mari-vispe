import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Knowledge Base — embedded at build time
import kb01 from "./kb/01-plataforma.md" with { type: "text" };
import kb02 from "./kb/02-premissas-scores.md" with { type: "text" };
import kb03 from "./kb/03-fontes-de-dados.md" with { type: "text" };
import kb04 from "./kb/04-graficos-interpretacao.md" with { type: "text" };
import kb05 from "./kb/05-pipeline-operacao.md" with { type: "text" };
import kb06 from "./kb/06-mna-playbook.md" with { type: "text" };
import kb07 from "./kb/07-aceleracao-deal.md" with { type: "text" };
import kb08 from "./kb/08-metas-e-prioridades.md" with { type: "text" };

const KNOWLEDGE_BASE = [
  `# 1. PLATAFORMA\n${kb01}`,
  `# 2. PREMISSAS & SCORES\n${kb02}`,
  `# 3. FONTES DE DADOS\n${kb03}`,
  `# 4. GRÁFICOS\n${kb04}`,
  `# 5. PIPELINE\n${kb05}`,
  `# 6. M&A PLAYBOOK\n${kb06}`,
  `# 7. ACELERAÇÃO DE DEAL\n${kb07}`,
  `# 8. METAS\n${kb08}`,
].join("\n\n---\n\n");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getLiveContext(supabase: any, userId: string, route?: string, entityType?: string, entityId?: string) {
  const parts: string[] = [];

  // Pipeline snapshot do usuário
  try {
    const { data: mandates } = await supabase
      .schema("equity_brain")
      .from("mandates")
      .select("id, codename, stage, asking_price, updated_at")
      .limit(50);
    if (mandates?.length) {
      const byStage: Record<string, number> = {};
      for (const m of mandates) {
        const s = m.stage ?? "sem_etapa";
        byStage[s] = (byStage[s] ?? 0) + 1;
      }
      parts.push(`PIPELINE SNAPSHOT (mandatos visíveis): total=${mandates.length}, por etapa=${JSON.stringify(byStage)}`);
    }
  } catch (e) { console.warn("mandates ctx fail", e); }

  // Top matches
  try {
    const { data: matches } = await supabase
      .from("eb_matches_enriched")
      .select("id, match_score, codename, buyer_nome")
      .order("match_score", { ascending: false })
      .limit(5);
    if (matches?.length) {
      parts.push(`TOP 5 MATCHES AGORA:\n${matches.map((m: any) => `- ${m.codename ?? "?"} ↔ ${m.buyer_nome ?? "?"} (score ${m.match_score})`).join("\n")}`);
    }
  } catch (e) { console.warn("matches ctx fail", e); }

  // Contexto da entidade aberta
  if (entityType === "mandate" && entityId) {
    try {
      const { data: m } = await supabase.schema("equity_brain").from("mandates").select("*").eq("id", entityId).maybeSingle();
      if (m) parts.push(`MANDATO ABERTO: ${JSON.stringify(m)}`);
    } catch {}
  }
  if (entityType === "buyer" && entityId) {
    try {
      const { data: b } = await supabase.schema("equity_brain").from("buyers").select("*").eq("id", entityId).maybeSingle();
      if (b) parts.push(`BUYER ABERTO: ${JSON.stringify(b)}`);
    } catch {}
  }

  if (route) parts.push(`ROTA ATUAL: ${route}`);
  parts.push(`USER_ID: ${userId}`);

  return parts.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { thread_id, message, route, entity_type, entity_id } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "message obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const token = auth.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    // Garantir thread
    let threadId = thread_id as string | undefined;
    if (!threadId) {
      const title = message.slice(0, 60);
      const { data: t, error: tErr } = await supabase
        .from("mari_brain_threads")
        .insert({ user_id: userId, title, route })
        .select("id")
        .single();
      if (tErr) throw tErr;
      threadId = t.id;
    }

    // Histórico recente
    const { data: history } = await supabase
      .from("mari_brain_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persiste mensagem do usuário
    await supabase.from("mari_brain_messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content: message,
    });

    // Contexto vivo
    const liveCtx = await getLiveContext(supabase, userId, route, entity_type, entity_id);

    const system = `Você é a **Mari Brain**, IA copilota oficial da plataforma mari (PME.B3 / Equity Brain).
Você é especialista sênior em M&A de PMEs no Brasil E especialista total na plataforma.

## Como você responde
- Português do Brasil, direta, prática, executiva. Curta por padrão; detalha quando o usuário pedir.
- Quando der uma instrução de "como fazer X na plataforma", cite a rota exata (ex: \`/equity-brain/match-inbox\`).
- Quando explicar um indicador, cite a tabela/view de origem.
- Quando der conselho de M&A, cite a etapa do funil (NDA, IOI, LOI, etc.) e seja específica em estrutura (cash, earn-out, vendor financing, ranges de múltiplos).
- Sugira sempre a próxima ação concreta no final.
- Use markdown (listas, **negrito**, \`código\`). Sem emojis em excesso (máximo 1 por resposta, opcional).
- Se faltar dado para responder, diga o que precisa ser preenchido e onde.

## Base de conhecimento (autoritativa)
${KNOWLEDGE_BASE}

## Contexto vivo do usuário (atualizado agora)
${liveCtx}`;

    const messages = [
      { role: "system", content: system },
      ...((history ?? []).map((h: any) => ({ role: h.role, content: h.content }))),
      { role: "user", content: message },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const errText = await aiRes.text().catch(() => "");
      console.error("AI error", status, errText);
      const msg = status === 429 ? "Rate limit — tente novamente em alguns segundos."
        : status === 402 ? "Sem créditos no AI Gateway. Adicione fundos em Settings → Workspace → Usage."
        : "Erro ao consultar o modelo.";
      return new Response(JSON.stringify({ error: msg, thread_id: threadId }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream + capture full reply para persistir
    let fullReply = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiRes.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Repassar exatamente o que recebemos para o cliente
            controller.enqueue(value);

            // Paralelamente: parse para capturar fullReply
            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const p = JSON.parse(json);
                const c = p.choices?.[0]?.delta?.content;
                if (c) fullReply += c;
              } catch { /* partial */ }
            }
          }
        } catch (e) {
          console.error("stream err", e);
        } finally {
          // Persistir resposta + envia thread_id como evento custom
          if (fullReply) {
            await supabase.from("mari_brain_messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "assistant",
              content: fullReply,
            });
            await supabase.from("mari_brain_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
          }
          // Sinaliza thread_id ao cliente
          controller.enqueue(encoder.encode(`\nevent: thread\ndata: ${JSON.stringify({ thread_id: threadId })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Thread-Id": threadId! },
    });
  } catch (e) {
    console.error("mari-brain error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
