// Equity Planner — ownership guard.
// Valida JWT do caller e confirma que ele é dono do assessment (ou admin/advisor).
// Usar no início de TODAS as edge functions do Equity Planner que rodam com service_role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth, authErrorResponse } from "./authGate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type OwnerResult =
  | { ok: true; userId: string; roles: string[]; ownerId: string }
  | { ok: false; response: Response };

/**
 * Verifica JWT e confere ownership do assessment.
 * - Aceita owner (assessment.user_id === jwt.user.id)
 * - Aceita roles 'admin' e 'advisor'
 * - Retorna 401 se sem token, 403 se sem permissão, 404 se assessment não existe.
 */
export async function requireAssessmentOwner(
  req: Request,
  assessmentId: string,
  corsHeaders: Record<string, string>,
): Promise<OwnerResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return { ok: false, response: authErrorResponse(auth, corsHeaders) };
  }

  if (!assessmentId) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "assessmentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
  const { data: assess, error } = await admin
    .from("equity_assessments")
    .select("user_id")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !assess) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "assessment_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const isOwner = assess.user_id === auth.userId;
  const isPrivileged = auth.roles.includes("admin") || auth.roles.includes("advisor");
  if (!isOwner && !isPrivileged) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, userId: auth.userId, roles: auth.roles, ownerId: assess.user_id };
}
