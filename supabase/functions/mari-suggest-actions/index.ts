import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pull mandates and activity for advisor (RLS already filters)
    const [{ data: mandates }, { data: contacts }, { data: recent }] = await Promise.all([
      supabase.schema("equity_brain").from("mandates").select("id,company_cnpj,status,temperature,updated_at,probability,expected_close_at").limit(50),
      supabase.schema("equity_brain").from("contacts").select("id,nome,temperature,updated_at,owner_user_id").limit(50),
      supabase.schema("equity_brain").from("crm_activities").select("entity_type,entity_id,kind,created_at").order("created_at", { ascending: false }).limit(80),
    ]);

    // Build heuristic signals
    const lastActivityByEntity = new Map<string, string>();
    for (const a of recent ?? []) {
      const k = `${a.entity_type}:${a.entity_id}`;
      if (!lastActivityByEntity.has(k)) lastActivityByEntity.set(k, a.created_at);
    }
    const now = Date.now();
    const daysSince = (iso: string | undefined) => iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : 999;

    const signals: any[] = [];
    for (const m of mandates ?? []) {
      const last = lastActivityByEntity.get(`mandate:${m.id}`) ?? m.updated_at;
      const ds = daysSince(last);
      if (ds >= 5) signals.push({ type: "follow_up", entity_type: "mandate", entity_id: m.id, label: m.company_cnpj, days_since: ds, temp: m.temperature });
      if (m.temperature === "hot") signals.push({ type: "hot", entity_type: "mandate", entity_id: m.id, label: m.company_cnpj });
    }
    for (const c of contacts ?? []) {
      const last = lastActivityByEntity.get(`buyer:${c.id}`) ?? c.updated_at;
      const ds = daysSince(last);
      if (ds >= 7) signals.push({ type: "follow_up", entity_type: "buyer", entity_id: c.id, label: c.nome ?? "Buyer", days_since: ds, temp: c.temperature });
    }

    // If no signals, return empty
    if (signals.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Limit input to AI to top 12
    const top = signals.slice(0, 12);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback heuristic-only
      const fallback = top.slice(0, 6).map((s) => ({
        priority: s.type === "hot" ? "hot" : s.days_since >= 10 ? "urgent" : "normal",
        message: s.type === "hot"
          ? `${s.label}: contato quente — agir hoje.`
          : `Sem follow-up há ${s.days_since} dias com ${s.label}.`,
        entity_type: s.entity_type,
        entity_id: s.entity_id,
        cta: "whatsapp",
      }));
      return new Response(JSON.stringify({ suggestions: fallback }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é a Mari, copiloto do advisor de M&A. Receba sinais e devolva uma lista priorizada de 5 a 8 ações, cada uma com 1 frase clara em PT-BR, ação concreta, sem jargão. Devolva via tool call." },
          { role: "user", content: `Sinais brutos: ${JSON.stringify(top)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "list_actions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: ["urgent", "hot", "normal"] },
                      message: { type: "string" },
                      entity_type: { type: "string", enum: ["mandate", "buyer"] },
                      entity_id: { type: "string" },
                      cta: { type: "string", enum: ["whatsapp", "view", "task"] },
                    },
                    required: ["priority", "message", "entity_type", "entity_id", "cta"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "list_actions" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const msg = status === 429 ? "Rate limit" : status === 402 ? "Sem créditos AI" : "Erro AI";
      return new Response(JSON.stringify({ error: msg, suggestions: [] }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { suggestions: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mari-suggest-actions", e);
    return new Response(JSON.stringify({ error: String(e), suggestions: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
