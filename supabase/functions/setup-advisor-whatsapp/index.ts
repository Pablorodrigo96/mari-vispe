// setup-advisor-whatsapp
// Admin-only. Inicia onboarding de WhatsApp para um advisor.
// Modo MOCK: gera phone_number_id fake e retorna instrução pra digitar 123456.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";
import { getMetaAdapter, MOCK_SMS_CODE } from "../_shared/metaWhatsappAdapter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizePhoneBR(raw: string): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  return null;
}

serve(withObservability(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Cliente para ler usuário a partir do JWT
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role pra operações sensíveis
    const svc = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // Admin check
    const { data: isAdmin } = await svc.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const advisor_id = body.advisor_id as string | undefined;
    const phone_raw = body.phone_number as string | undefined;
    if (!advisor_id || !phone_raw) {
      return new Response(
        JSON.stringify({ error: "missing advisor_id or phone_number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const phone = normalizePhoneBR(phone_raw);
    if (!phone) {
      return new Response(JSON.stringify({ error: "invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Já existe config ativa?
    const { data: existing } = await svc
      .from("advisor_whatsapp_config")
      .select("id, status")
      .eq("advisor_id", advisor_id)
      .maybeSingle();
    if (existing && existing.status === "active") {
      return new Response(
        JSON.stringify({ error: "advisor already has active WhatsApp config" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limpa pending antigo
    await svc.from("advisor_whatsapp_setup_pending")
      .delete().eq("advisor_id", advisor_id);

    // Adapter (mock por padrão)
    const adapter = getMetaAdapter();
    const { phone_number_id } = await adapter.registerPhoneNumber(phone);

    const { error: insertErr } = await svc
      .from("advisor_whatsapp_setup_pending")
      .insert({
        advisor_id,
        phone_number: phone,
        phone_number_id,
        status: "awaiting_sms_confirmation",
        is_mock: adapter.mode === "mock",
      });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        status: "awaiting_confirmation",
        advisor_id,
        phone_number: phone,
        phone_number_id,
        is_mock: adapter.mode === "mock",
        mock_code: adapter.mode === "mock" ? MOCK_SMS_CODE : undefined,
        mock_hint: adapter.mode === "mock"
          ? `Modo simulado: digite ${MOCK_SMS_CODE} para confirmar`
          : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[setup-advisor-whatsapp] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "setup-advisor-whatsapp" }));
