// captable-sync-rfb — sincroniza QSA da RFB com company_partners do cap-table.
// Preserva linhas source='manual' e substitui apenas source='rfb'.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sbUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await sbUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { captable_id } = await req.json();
    if (!captable_id) return new Response(JSON.stringify({ error: "captable_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: cap, error: capErr } = await sb.from("company_captables").select("*").eq("id", captable_id).single();
    if (capErr || !cap) return new Response(JSON.stringify({ error: "captable not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ownership: dono OR admin/advisor
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
    const isAdminOrAdvisor = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (cap.user_id !== userId && !isAdminOrAdvisor) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!cap.cnpj) {
      return new Response(JSON.stringify({ error: "captable sem CNPJ" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Chama national-search type=cnpj
    const lookup = await fetch(`${supabaseUrl}/functions/v1/national-search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cnpj", cnpj: cap.cnpj }),
    });

    if (!lookup.ok) {
      return new Response(JSON.stringify({ error: `national-search ${lookup.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payload = await lookup.json();
    const company = payload?.company ?? null;
    const socios: any[] = Array.isArray(company?.socios) ? company.socios : [];

    // Atualiza razão/fantasia
    const updates: any = {};
    if (company?.razao_social) updates.razao_social = company.razao_social;
    if (company?.nome_fantasia) updates.nome_fantasia = company.nome_fantasia;
    if (Object.keys(updates).length) {
      await sb.from("company_captables").update(updates).eq("id", captable_id);
    }

    // Substitui apenas source='rfb'
    await sb.from("company_partners").delete().eq("captable_id", captable_id).eq("source", "rfb");

    let inserted = 0;
    if (socios.length > 0) {
      const evenPct = Math.round((100 / socios.length) * 100) / 100;
      const rows = socios.map((s) => ({
        captable_id,
        nome: s.nome || "Sócio",
        documento: s.cpf_cnpj || null,
        qualificacao: s.qualificacao || null,
        pct: evenPct,
        source: "rfb",
        is_pf: !(s.cpf_cnpj && String(s.cpf_cnpj).replace(/\D/g, "").length === 14),
      }));
      const { error: insErr, count } = await sb.from("company_partners").insert(rows, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? rows.length;
    }

    return new Response(JSON.stringify({ ok: true, partners_synced: inserted, data_source: company?.data_source_qsa ?? "unavailable" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("captable-sync-rfb error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
