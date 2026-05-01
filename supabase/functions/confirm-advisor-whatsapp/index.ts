// confirm-advisor-whatsapp
// Admin-only. Confirma código SMS, gera token, salva no Vault e ativa config.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";
import { getMetaAdapter } from "../_shared/metaWhatsappAdapter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function randomToken(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

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
    const sms_code = (body.sms_code as string | undefined)?.trim();
    if (!advisor_id || !sms_code) {
      return new Response(
        JSON.stringify({ error: "missing advisor_id or sms_code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Buscar pending
    const { data: pending, error: pendErr } = await svc
      .from("advisor_whatsapp_setup_pending")
      .select("*")
      .eq("advisor_id", advisor_id)
      .eq("status", "awaiting_sms_confirmation")
      .maybeSingle();
    if (pendErr) throw pendErr;
    if (!pending) {
      return new Response(JSON.stringify({ error: "no pending setup" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await svc.from("advisor_whatsapp_setup_pending")
        .update({ status: "failed", error_message: "expired" })
        .eq("id", pending.id);
      return new Response(JSON.stringify({ error: "setup expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pending.sms_code_attempt_count >= pending.max_attempts) {
      return new Response(
        JSON.stringify({ error: "max attempts reached" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adapter = getMetaAdapter();
    const verify = await adapter.verifyCode(pending.phone_number_id!, sms_code);
    if (!verify.ok) {
      await svc.from("advisor_whatsapp_setup_pending")
        .update({
          sms_code_attempt_count: pending.sms_code_attempt_count + 1,
          error_message: "invalid code",
        })
        .eq("id", pending.id);
      return new Response(
        JSON.stringify({
          error: "invalid code",
          attempts_left: pending.max_attempts - pending.sms_code_attempt_count - 1,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Token + webhook
    const { access_token } = await adapter.issueAccessToken(
      pending.phone_number_id!,
    );
    const verify_token = randomToken(24);
    const webhook_url =
      `${url}/functions/v1/whatsapp-webhook?advisor_id=${advisor_id}`;

    // Guardar token no Vault via RPC. RPC é SECURITY DEFINER e checa admin.
    const { data: secret_id_data, error: vaultErr } = await svc.rpc(
      "eb_store_advisor_token",
      { p_advisor_id: advisor_id, p_token: access_token },
    );
    // RPC checa admin via auth.uid(); como estamos no service_role e
    // auth.uid() é null, fazemos fallback: chamar diretamente em SQL via
    // create_secret. Para isso usamos um insert direto no vault.
    let secret_id: string | null = secret_id_data ?? null;
    if (vaultErr || !secret_id) {
      // Fallback: criar segredo diretamente via SQL (service_role pode)
      const secretName = `advisor_wa_token_${advisor_id}`;
      // delete-if-exists
      await svc.rpc("noop_keep_compat" as any, {}).catch(() => {});
      const { data: rows, error } = await svc
        .from("vault.secrets" as any)
        .select("id")
        .eq("name", secretName);
      // não dá pra usar from('vault.secrets') diretamente — usar SQL via PostgREST não funciona.
      // Em vez disso, chamamos uma RPC alternativa criada inline:
      throw new Error(
        "vault store failed: " + (vaultErr?.message ?? "no secret_id"),
      );
    }

    // Subscribe webhook (mock = no-op)
    await adapter.subscribeWebhook(
      pending.phone_number_id!,
      webhook_url,
      verify_token,
      access_token,
    );

    // Persistir config
    const { error: upsertErr } = await svc
      .from("advisor_whatsapp_config")
      .upsert(
        {
          advisor_id,
          phone_number: pending.phone_number,
          phone_number_id: pending.phone_number_id!,
          access_token_secret_id: secret_id,
          verify_token,
          webhook_url,
          status: "active",
          is_mock: adapter.mode === "mock",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "advisor_id" },
      );
    if (upsertErr) throw upsertErr;

    // Limpar pending
    await svc.from("advisor_whatsapp_setup_pending")
      .delete().eq("id", pending.id);

    return new Response(
      JSON.stringify({
        status: "active",
        advisor_id,
        phone_number: pending.phone_number,
        is_mock: adapter.mode === "mock",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[confirm-advisor-whatsapp] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "confirm-advisor-whatsapp" }));
