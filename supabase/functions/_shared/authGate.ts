// Shared auth gate for edge functions.
// Validates Bearer JWT and optionally requires admin/advisor role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type AuthResult =
  | { ok: true; userId: string; roles: string[]; token: string }
  | { ok: false; status: number; error: string };

export interface RequireAuthOptions {
  /** If set, require the user to have at least one of these roles. */
  requireAnyRole?: Array<"admin" | "advisor" | "franchisee" | "seller" | "buyer">;
}

/**
 * Verifies the Authorization: Bearer <jwt> header.
 * Returns userId + roles or an error envelope.
 */
export async function requireAuth(
  req: Request,
  opts: RequireAuthOptions = {},
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }
  const token = authHeader.slice("bearer ".length).trim();

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  let userId: string | null = null;
  try {
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) {
      return { ok: false, status: 401, error: "Invalid token" };
    }
    userId = data.user.id;
  } catch (_) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  // Look up roles via service-role (RLS-safe).
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (roleRows ?? []).map((r: any) => String(r.role));

  if (opts.requireAnyRole && opts.requireAnyRole.length > 0) {
    const allowed = opts.requireAnyRole.some((r) => roles.includes(r));
    if (!allowed) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  return { ok: true, userId, roles, token };
}

export function authErrorResponse(
  result: Extract<AuthResult, { ok: false }>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: result.error }), {
    status: result.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
