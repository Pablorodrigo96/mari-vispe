// Edge function: cria conta para usuário não-logado que conclui o Plano Perfeito
// e PERSISTE o plano no banco usando service-role (não depende da sessão propagar
// no cliente). Devolve senha para auto-login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  password?: string;
  // Novos campos — dados do plano para persistir no servidor
  valuationInputs?: Record<string, unknown>;
  planoInputs?: Record<string, unknown>;
  result?: {
    valuationAtual?: number;
    valuationMeta?: number;
    investimentoMensal?: number;
    viabilidade?: "green" | "yellow" | "red";
    [k: string]: unknown;
  };
}

const generateTempPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint32Array(16);
  crypto.getRandomValues(buf);
  for (const n of buf) out += chars[n % chars.length];
  return out + "A9!";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const phone = (body.phone || "").trim();
    const companyName = (body.companyName || "").trim();
    const userPassword = (body.password || "").trim();

    if (!fullName || !email.includes("@") || !phone || !companyName) {
      return new Response(JSON.stringify({ success: false, error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper para persistir o plano no banco (service-role bypassa RLS)
    const savePlano = async (userId: string): Promise<{ ok: boolean; planoId?: string; error?: string }> => {
      if (!body.valuationInputs || !body.planoInputs || !body.result) {
        return { ok: false, error: "missing plano payload" };
      }
      const { data: inserted, error: insertErr } = await admin
        .from("planos_perfeitos")
        .insert({
          user_id: userId,
          valuation_inputs: body.valuationInputs as any,
          plano_inputs: body.planoInputs as any,
          result: body.result as any,
          valuation_atual: body.result.valuationAtual ?? null,
          valuation_meta: body.result.valuationMeta ?? null,
          investimento_mensal: body.result.investimentoMensal ?? null,
          viabilidade: body.result.viabilidade ?? null,
          lead_tag: "plano_perfeito",
        } as any)
        .select("id")
        .single();

      if (insertErr) {
        console.error("planos_perfeitos insert error", insertErr);
        return { ok: false, error: insertErr.message };
      }
      return { ok: true, planoId: (inserted as any)?.id };
    };

    // 1. Verificar se já existe um user com esse e-mail
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === email);

    if (found) {
      // Conta já existe — não cria de novo, mas tenta salvar o plano sob o user existente
      const persist = await savePlano(found.id);
      return new Response(
        JSON.stringify({
          success: true,
          alreadyExists: true,
          planoSaved: persist.ok,
          planoId: persist.planoId,
          planoError: persist.error,
          message: "Conta já existente. Faça login para ver seu Plano Perfeito.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Criar user já confirmado
    const finalPassword = userPassword.length >= 8 ? userPassword : generateTempPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        roles: ["seller"],
        profile: "seller",
        signup_perfil: "seller",
        signup_source: "plano_perfeito",
      },
    });

    if (createErr || !created?.user) {
      console.error("createUser error", createErr);
      return new Response(JSON.stringify({ success: false, error: createErr?.message || "Falha ao criar conta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;

    // 3. Atualizar profile com phone + tag (trigger handle_new_user já criou)
    await admin
      .from("profiles")
      .update({ phone, lead_tag: "plano_perfeito" } as any)
      .eq("user_id", userId);

    // 4. Persistir o plano no banco IMEDIATAMENTE (service-role, não depende de sessão)
    const persist = await savePlano(userId);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        tempPassword: finalPassword,
        planoSaved: persist.ok,
        planoId: persist.planoId,
        planoError: persist.error,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("plano-perfeito-signup error", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
