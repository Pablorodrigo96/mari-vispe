import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const CACHE_HOURS = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { symbol, token_id, force } = await req.json().catch(() => ({}));
    if (!symbol && !token_id) {
      return json({ error: "symbol or token_id required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find token
    const tokenQ = token_id
      ? admin.from("tokens").select("*").eq("id", token_id).maybeSingle()
      : admin.from("tokens").select("*").eq("symbol", symbol).maybeSingle();
    const { data: token } = await tokenQ;
    if (!token) return json({ error: "token_not_found" }, 404);

    // Cache check
    if (!force) {
      const { data: cached } = await admin
        .from("mari_company_summaries")
        .select("*")
        .eq("token_id", token.id)
        .maybeSingle();
      if (cached?.generated_at) {
        const ageMs = Date.now() - new Date(cached.generated_at).getTime();
        if (ageMs < CACHE_HOURS * 3600 * 1000) {
          return json({ summary: cached.summary, bullets: cached.bullets, cached: true });
        }
      }
    }

    // Gather context
    const [{ data: listing }, { data: posts }] = await Promise.all([
      token.listing_id
        ? admin.from("listings").select("*").eq("id", token.listing_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("company_posts")
        .select("kind,category,title,body,metrics,created_at")
        .eq("token_id", token.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const ctx = {
      name: token.name,
      sector: (listing as any)?.category || (token as any).sector,
      city: [(listing as any)?.city, (listing as any)?.state].filter(Boolean).join("/"),
      raised: token.amount_raised,
      goal: token.total_offering_amount,
      status: token.status,
      description: (listing as any)?.description?.slice(0, 800),
      posts: (posts || []).slice(0, 12).map((p: any) => ({
        kind: p.kind,
        title: p.title,
        body: (p.body || "").slice(0, 300),
        metrics: p.metrics,
        when: p.created_at,
      })),
    };

    let summary = `${token.name} segue documentando sua jornada na Mari, com atualizações recentes da operação, indicadores e comunicação ativa com a comunidade.`;
    let bullets: { label: string; body: string }[] = [
      { label: "Mudanças", body: "Avanços operacionais reportados nas últimas semanas." },
      { label: "Indicadores", body: "Métricas-chave evoluindo conforme plano." },
      { label: "Riscos", body: "Pontos de atenção monitorados pela equipe." },
    ];

    if (LOVABLE_API_KEY) {
      const prompt = `Você é a Mari, IA de uma rede social patrimonial brasileira. Resuma em PT-BR a evolução recente desta empresa em ATÉ 2 frases (máx 320 caracteres), com tom social/jornalístico — sem jargão financeiro, sem promessa de retorno. Depois gere 3 bullets curtos (até 110 chars cada) nas categorias: Mudanças, Indicadores, Riscos. Responda APENAS JSON: {"summary":"...","bullets":[{"label":"Mudanças","body":"..."},{"label":"Indicadores","body":"..."},{"label":"Riscos","body":"..."}]}.

Contexto:
${JSON.stringify(ctx)}`;

      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": LOVABLE_API_KEY,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const txt = j.choices?.[0]?.message?.content || "";
          const parsed = JSON.parse(txt);
          if (parsed.summary) summary = parsed.summary;
          if (Array.isArray(parsed.bullets) && parsed.bullets.length) bullets = parsed.bullets.slice(0, 3);
        } else {
          console.error("AI gateway error", r.status, await r.text());
        }
      } catch (e) {
        console.error("AI call failed", e);
      }
    }

    await admin
      .from("mari_company_summaries")
      .upsert({ token_id: token.id, summary, bullets, generated_at: new Date().toISOString() }, { onConflict: "token_id" });

    return json({ summary, bullets, cached: false });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "internal" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
