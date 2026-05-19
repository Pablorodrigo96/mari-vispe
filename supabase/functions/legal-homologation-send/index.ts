// legal-homologation-send
// Cria registro em legal_homologations e devolve URL pública /homologacao/:token
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface ReqBody {
  document_id: string;
  lawyer_name: string;
  lawyer_email: string;
  public_base_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = ["admin", "advisor", "legal"].some((r) =>
      (roles ?? []).map((x: any) => x.role).includes(r),
    );
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as ReqBody;
    if (!body.document_id || !body.lawyer_name || !body.lawyer_email) {
      return json({ error: "missing_fields" }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.lawyer_email)) {
      return json({ error: "invalid_email" }, 400);
    }

    const { data: doc, error: docErr } = await admin
      .from("deal_documents")
      .select("id, label, requires_partner_approval, partner_approved_at")
      .eq("id", body.document_id)
      .maybeSingle();
    if (docErr || !doc) return json({ error: "document_not_found" }, 404);
    if (doc.requires_partner_approval && !doc.partner_approved_at) {
      return json({ error: "partner_approval_required" }, 412);
    }

    const { data: hom, error: insErr } = await admin
      .from("legal_homologations")
      .insert({
        document_id: body.document_id,
        lawyer_name: body.lawyer_name,
        lawyer_email: body.lawyer_email,
        sent_by: u.user.id,
      })
      .select()
      .single();
    if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

    await admin
      .from("deal_documents")
      .update({ homologation_status: "pending" })
      .eq("id", body.document_id);

    await admin.from("audit_events").insert({
      event_type: "legal_homologation_sent",
      entity_type: "legal_document",
      entity_id: body.document_id,
      actor_user_id: u.user.id,
      payload: { homologation_id: hom.id, lawyer_email: body.lawyer_email },
    });

    const base = body.public_base_url ?? "https://mari.vispe.com.br";
    const url = `${base.replace(/\/$/, "")}/homologacao/${hom.access_token}`;

    // TODO: integrar Resend para envio de e-mail; por ora retornamos o link copiável.
    return json({ ok: true, homologation: hom, public_url: url, email_sent: false });
  } catch (e: any) {
    console.error("[legal-homologation-send]", e);
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
