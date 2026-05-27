// Edge function: cria conta para usuário não-logado que conclui o Plano Perfeito.
// Usa service-role para criar o user já confirmado e devolve senha temporária
// para auto-login no cliente. Marca o profile com lead_tag = plano_perfeito.

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
}

const generateTempPassword = () => {
  // 16 chars, garante upper+lower+digit
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

    // 1. Verificar se já existe um user com esse e-mail
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === email);

    if (found) {
      // Conta já existe — não criar de novo nem mudar a senha. Cliente
      // deve pedir reset por outro fluxo. Devolvemos success sem tempPassword
      // para o cliente redirecionar p/ login.
      return new Response(
        JSON.stringify({
          success: true,
          alreadyExists: true,
          message: "Conta já existente. Faça login para ver seu Plano Perfeito.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Criar user já confirmado — usa senha do usuário se fornecida, senão temporária
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

    // 3. Atualizar profile (criado pelo trigger handle_new_user) com phone + tag
    await admin
      .from("profiles")
      .update({ phone, lead_tag: "plano_perfeito" } as any)
      .eq("user_id", userId);

    // Best effort — se a coluna lead_tag não existir, ignora silenciosamente
    // (não bloqueia o fluxo). O signup_source já está no auth.users metadata.

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        tempPassword, // cliente faz signInWithPassword imediatamente
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
