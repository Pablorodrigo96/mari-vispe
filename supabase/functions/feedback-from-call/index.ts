// Equity Brain — feedback-from-call
// Porta de entrada do BDR após uma call. Persiste call_feedback, chama claude-analyze-call,
// cria company_signals (que disparam triggers → events → process-event).
// Auth: admin OR advisor OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_OUTCOMES = new Set([
  "no_answer", "wrong_contact", "not_interested", "interested_later",
  "qualified", "meeting_scheduled", "mandate_signed", "lost",
]);
const VALID_TIMING = new Set(["agora", "6m", "12m+", "nao"]);
const VALID_DOR = new Set(["sucessao", "crescimento", "financeiro", "gestao", "societario", "outra"]);

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
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden: admin or advisor only", userId };
  return { ok: true, userId };
}

function validate(body: any): { ok: true; data: any } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body required" };
  const cnpj = String(body.cnpj ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { ok: false, error: "cnpj must have 14 digits" };
  const outcome = String(body.outcome ?? "");
  if (!VALID_OUTCOMES.has(outcome)) return { ok: false, error: `outcome must be one of: ${[...VALID_OUTCOMES].join("|")}` };
  const interest_level = body.interest_level == null ? null : Number(body.interest_level);
  if (interest_level != null && (!Number.isInteger(interest_level) || interest_level < 1 || interest_level > 5)) {
    return { ok: false, error: "interest_level must be int 1..5" };
  }
  const timing = body.timing_estimado == null ? null : String(body.timing_estimado);
  if (timing && !VALID_TIMING.has(timing)) return { ok: false, error: `timing_estimado must be one of: ${[...VALID_TIMING].join("|")}` };
  const dor = body.dor_principal == null ? null : String(body.dor_principal);
  if (dor && !VALID_DOR.has(dor)) return { ok: false, error: `dor_principal must be one of: ${[...VALID_DOR].join("|")}` };
  const raw_notes = body.raw_notes == null ? null : String(body.raw_notes);
  if (raw_notes != null && raw_notes.length < 20) return { ok: false, error: "raw_notes too short (min 20 chars)" };
  return {
    ok: true,
    data: {
      cnpj,
      bdr_user_id: body.bdr_user_id ?? null,
      outcome,
      interest_level,
      timing_estimado: timing,
      dor_principal: dor,
      faturamento_revelado: body.faturamento_revelado == null ? null : Number(body.faturamento_revelado),
      ebitda_revelado: body.ebitda_revelado == null ? null : Number(body.ebitda_revelado),
      num_socios_real: body.num_socios_real == null ? null : Number(body.num_socios_real),
      raw_notes,
      duration_seconds: body.duration_seconds == null ? null : Number(body.duration_seconds),
      followup_at: body.followup_at ?? null,
      followup_action: body.followup_action ?? null,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const v = validate(rawBody);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = v.data;
    // Garante que bdr_user_id seja preenchido com auth.uid se não vier no body
    const bdr_user_id = data.bdr_user_id || auth.userId;

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) INSERT call_feedback (trigger trg_emit_call_event cria event automaticamente)
    const { data: feedbackRow, error: insErr } = await supabase
      .schema("equity_brain" as any)
      .from("call_feedback")
      .insert({ ...data, bdr_user_id })
      .select("id")
      .single();
    if (insErr || !feedbackRow) {
      return new Response(JSON.stringify({ error: `insert call_feedback: ${insErr?.message ?? "unknown"}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const feedback_id = feedbackRow.id;

    // 2) Chama claude-analyze-call SE houver notas suficientes
    let aiSummary: string | null = null;
    let signalsAdded: string[] = [];
    let aiParsed: any = null;

    if (data.raw_notes && data.raw_notes.length >= 50) {
      try {
        const aiResp = await fetch(`${supabaseUrl}/functions/v1/claude-analyze-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            cnpj: data.cnpj,
            call_notes: data.raw_notes,
            bdr_id: bdr_user_id,
          }),
        });
        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          aiParsed = aiJson?.parsed ?? null;
          aiSummary = aiParsed?.followup_recomendado ?? null;

          // 3) UPDATE call_feedback.ai_extracted
          await supabase
            .schema("equity_brain" as any)
            .from("call_feedback")
            .update({ ai_extracted: aiParsed })
            .eq("id", feedback_id);

          // 4) Para cada signal_key sugerido pela IA: valida no catálogo + INSERT
          const suggested: string[] = Array.isArray(aiParsed?.sinais_novos) ? aiParsed.sinais_novos : [];
          if (suggested.length > 0) {
            const { data: catalog } = await supabase
              .schema("equity_brain" as any)
              .from("signal_catalog")
              .select("signal_key, default_weight")
              .in("signal_key", suggested);
            const validKeys = new Map((catalog ?? []).map((c: any) => [c.signal_key, Number(c.default_weight ?? 0.7)]));

            const trecho = (data.raw_notes ?? "").slice(0, 280);
            for (const key of suggested) {
              if (!validKeys.has(key)) continue;
              const weight = Math.max(0.7, validKeys.get(key)!);
              const { error: sigErr } = await supabase
                .schema("equity_brain" as any)
                .from("company_signals")
                .insert({
                  cnpj: data.cnpj,
                  signal_key: key,
                  signal_value: null,
                  signal_text: `[call ${feedback_id}] ${trecho}`,
                  weight,
                  source: "call",
                  source_ref: feedback_id,
                  confidence: 0.7,
                });
              if (sigErr) {
                // Conflito esperado se signal já existe (sem unique constraint, então só loga)
                console.log(`[feedback-from-call] signal insert ${key} for ${data.cnpj}:`, sigErr.message);
              } else {
                signalsAdded.push(key);
              }
            }

            // 5) UPDATE call_feedback.signals_added
            if (signalsAdded.length > 0) {
              await supabase
                .schema("equity_brain" as any)
                .from("call_feedback")
                .update({ signals_added: signalsAdded })
                .eq("id", feedback_id);
            }
          }
        } else {
          const errTxt = await aiResp.text();
          console.error(`[feedback-from-call] claude-analyze-call ${aiResp.status}: ${errTxt.slice(0, 300)}`);
        }
      } catch (e) {
        console.error("[feedback-from-call] claude-analyze-call crashed:", e);
        // Não bloqueia — feedback foi salvo, evento foi emitido pelo trigger
      }
    }

    // 6) Fase 7 — se outcome quente, gera próximo pitch via Claude (não bloqueia se falhar)
    let nextPitch: any = null;
    const HOT_OUTCOMES = new Set(["qualified", "interested_later", "meeting_scheduled"]);
    if (HOT_OUTCOMES.has(data.outcome)) {
      try {
        const pitchResp = await fetch(`${supabaseUrl}/functions/v1/claude-generate-pitch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            cnpj: data.cnpj,
            context_call_id: feedback_id,
            ai_extracted: aiParsed,
            interest_level: data.interest_level,
            timing_estimado: data.timing_estimado,
            dor_principal: data.dor_principal,
          }),
        });
        if (pitchResp.ok) {
          const pj = await pitchResp.json();
          nextPitch = pj?.pitch ?? pj ?? null;
          if (nextPitch) {
            await supabase
              .schema("equity_brain" as any)
              .from("call_feedback")
              .update({ next_pitch: nextPitch })
              .eq("id", feedback_id);
          }
        } else {
          const t = await pitchResp.text();
          console.log(`[feedback-from-call] claude-generate-pitch ${pitchResp.status}: ${t.slice(0, 200)}`);
        }
      } catch (e) {
        console.log("[feedback-from-call] pitch generation crashed:", e);
      }
    }

    // 7) Aceleração: dispara process-event (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/process-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({}),
    }).then((r) => r.text()).catch((e) => console.log("[feedback-from-call] process-event nudge failed:", e));

    return new Response(JSON.stringify({
      ok: true,
      feedback_id,
      ai_summary: aiSummary,
      signals_added: signalsAdded,
      ai_parsed: aiParsed,
      next_pitch: nextPitch,
      score_will_recompute: true,
      hint: "Score e matches serão atualizados em ~5-10s. Consulte equity_brain.opportunities_ready ou companies_scored.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("feedback-from-call error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
