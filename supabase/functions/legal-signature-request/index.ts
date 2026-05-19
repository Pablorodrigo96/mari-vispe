// legal-signature-request
// Cria N registros de internal_signatures (um por signatário) e devolve URLs públicas /assinar/:token
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Signer {
  email: string;
  name: string;
  role: "seller" | "buyer" | "witness" | "advisor" | "legal" | "admin" | "partner";
  user_id?: string | null;
}
interface ReqBody {
  document_id: string;
  signers: Signer[];
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
    if (!body.document_id || !Array.isArray(body.signers) || body.signers.length === 0) {
      return json({ error: "missing_fields" }, 400);
    }
    for (const s of body.signers) {
      if (!s.email || !s.name || !s.role) {
        return json({ error: "invalid_signer", signer: s }, 400);
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) {
        return json({ error: "invalid_email", email: s.email }, 400);
      }
    }

    const { data: doc, error: docErr } = await admin
      .from("deal_documents")
      .select("id, label, homologation_status, requires_partner_approval, partner_approved_at")
      .eq("id", body.document_id)
      .maybeSingle();
    if (docErr || !doc) return json({ error: "document_not_found" }, 404);
    if (doc.requires_partner_approval && !doc.partner_approved_at) {
      return json({ error: "partner_approval_required" }, 412);
    }

    const rows = body.signers.map((s) => ({
      document_id: body.document_id,
      signer_user_id: s.user_id ?? null,
      signer_email: s.email,
      signer_name: s.name,
      signer_role: s.role,
      requested_by: u.user.id,
    }));
    const { data: inserted, error: insErr } = await admin
      .from("internal_signatures")
      .insert(rows)
      .select();
    if (insErr) return json({ error: "insert_failed", detail: insErr.message }, 500);

    await admin
      .from("deal_documents")
      .update({ status: "pending_signature" })
      .eq("id", body.document_id);

    await admin.from("audit_events").insert({
      event_type: "legal_signature_requested",
      entity_type: "legal_document",
      entity_id: body.document_id,
      actor_user_id: u.user.id,
      payload: { signer_count: rows.length },
    });

    const base = body.public_base_url ?? "https://mari.vispe.com.br";
    const out = (inserted ?? []).map((row: any) => ({
      id: row.id,
      signer_name: row.signer_name,
      signer_email: row.signer_email,
      signer_role: row.signer_role,
      public_url: `${base.replace(/\/$/, "")}/assinar/${row.sign_token}`,
    }));

    return json({ ok: true, signatures: out });
  } catch (e: any) {
    console.error("[legal-signature-request]", e);
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
