// Edge function: create-partner
// Permite que um admin crie um novo parceiro contábil com acesso à plataforma.
// - Cria usuário em auth.users (admin API)
// - Cria perfil com is_partner_accountant=true e partner_status='active'
// - Atribui role 'advisor' em user_roles
// - Gera magic link para o admin compartilhar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePartnerBody {
  email?: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check admin role
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate body
    const body: CreatePartnerBody = await req.json().catch(() => ({}));
    const email = (body.email ?? "").trim().toLowerCase();
    const full_name = (body.full_name ?? "").trim();
    const phone = (body.phone ?? "").trim() || null;
    const company_name = (body.company_name ?? "").trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!full_name || full_name.length < 2) {
      return new Response(JSON.stringify({ error: "Nome obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or fetch existing auth user
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr && /already.*registered|exists/i.test(createErr.message)) {
      // Find existing
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!found) {
        return new Response(
          JSON.stringify({ error: "Usuário já existe mas não foi possível recuperar" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      userId = found.id;
    } else if (createErr) {
      return new Response(
        JSON.stringify({ error: createErr.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Falha ao criar usuário" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert profile
    await admin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          full_name,
          phone,
          company_name,
          is_partner_accountant: true,
          partner_status: "active",
        },
        { onConflict: "user_id" }
      );

    // Ensure advisor role
    await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "advisor" },
        { onConflict: "user_id,role" }
      );

    // Generate magic link
    let magicLink: string | null = null;
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    magicLink = linkData?.properties?.action_link ?? null;

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, magic_link: magicLink }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("create-partner error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
