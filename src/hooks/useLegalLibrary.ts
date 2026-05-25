import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LibraryDocSource = "deal_documents" | "crm_documents";

export interface LibraryDoc {
  id: string;
  source: LibraryDocSource;
  category: string;          // nda | nbo | term_sheet | spa | other
  label: string;
  status: string;            // draft | pending_signature | signed | archived | other
  homologation_status?: string | null;
  ai_provider?: string | null;
  ai_model?: string | null;
  critique_score?: number | null;
  version_number?: number | null;
  file_url?: string | null;          // for crm_documents
  storage_path?: string | null;      // for deal_documents
  has_body: boolean;
  created_at: string;
  signed_at?: string | null;
  uploaded_by?: string | null;

  // Cliente resolvido
  client_key: string;        // chave única para agrupamento
  client_label: string;      // ex.: "MARI-TEC-0012 — Acme"
  client_subtitle?: string;  // ex.: "Mandato SaaS B2B · SP"
  deal_pair_id?: string | null;
  deal_id?: string | null;
  mandate_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface LibraryGroup {
  key: string;
  label: string;
  subtitle?: string;
  deal_pair_id?: string | null;
  mandate_id?: string | null;
  docs: LibraryDoc[];
}

export interface LibraryFilters {
  search?: string;
  category?: string;        // "all" | nda | nbo | term_sheet | spa | other
  status?: string;          // "all" | draft | pending_signature | signed | archived
  source?: string;          // "all" | deal_documents | crm_documents
  clientKey?: string;       // group key
}

export function useLegalLibrary(filters: LibraryFilters = {}) {
  return useQuery({
    queryKey: ["legal-library", filters],
    queryFn: async (): Promise<{ docs: LibraryDoc[]; groups: LibraryGroup[] }> => {
      // 1. deal_documents
      const dd = await supabase
        .from("deal_documents" as never)
        .select(
          "id, label, category, template_code, status, homologation_status, ai_provider, ai_model, critique_score, version_number, storage_path, generated_body, created_at, signed_at, uploaded_by, deal_pair_id, deal_id"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (dd.error) throw dd.error;

      // Coletar deal_pair_ids
      const pairIds = Array.from(
        new Set(((dd.data ?? []) as any[]).map((d) => d.deal_pair_id).filter(Boolean))
      );

      // 2. deal_pairs com mandate ids
      const pairsById = new Map<string, any>();
      if (pairIds.length) {
        const dp = await supabase
          .from("deal_pairs" as never)
          .select("id, sell_mandate_id, buy_mandate_id, buyer_profile_id, responsavel_advisor_id, status")
          .in("id", pairIds);
        if (!dp.error) for (const r of (dp.data ?? []) as any[]) pairsById.set(r.id, r);
      }

      // 3. mandates → company_cnpj
      const mandateIds = Array.from(
        new Set(
          Array.from(pairsById.values())
            .flatMap((p) => [p.sell_mandate_id, p.buy_mandate_id])
            .filter(Boolean)
        )
      );
      const mandateByid = new Map<string, any>();
      const cnpjs: string[] = [];
      if (mandateIds.length) {
        const m = await supabase
          .schema("equity_brain" as any)
          .from("mandates" as any)
          .select("id, company_cnpj, deal_type, setor, uf")
          .in("id", mandateIds);
        if (!m.error) {
          for (const r of (m.data ?? []) as any[]) {
            mandateByid.set(r.id, r);
            if (r.company_cnpj) cnpjs.push(r.company_cnpj);
          }
        }
      }

      // 4. companies por cnpj → codename
      const companyByCnpj = new Map<string, any>();
      if (cnpjs.length) {
        const c = await supabase
          .schema("equity_brain" as any)
          .from("companies" as any)
          .select("cnpj, codename, nome_fantasia, razao_social, uf, municipio")
          .in("cnpj", Array.from(new Set(cnpjs)));
        if (!c.error) for (const r of (c.data ?? []) as any[]) companyByCnpj.set(r.cnpj, r);
      }

      // 5. buyer profiles (para mostrar nome do comprador)
      const buyerProfileIds = Array.from(
        new Set(
          Array.from(pairsById.values())
            .map((p) => p.buyer_profile_id)
            .filter(Boolean)
        )
      );
      const buyerById = new Map<string, any>();
      if (buyerProfileIds.length) {
        const bp = await supabase
          .from("buyer_profiles")
          .select("id, buyer_name, company_name")
          .in("id", buyerProfileIds);
        if (!bp.error) for (const r of (bp.data ?? []) as any[]) buyerById.set(r.id, r);
      }

      const docs: LibraryDoc[] = [];

      for (const r of (dd.data ?? []) as any[]) {
        let clientKey = "sem-cliente";
        let clientLabel = "Sem cliente vinculado";
        let clientSubtitle: string | undefined;
        let mandateId: string | null = null;

        if (r.deal_pair_id && pairsById.has(r.deal_pair_id)) {
          const pair = pairsById.get(r.deal_pair_id);
          mandateId = pair.sell_mandate_id;
          const sellMandate = pair.sell_mandate_id ? mandateByid.get(pair.sell_mandate_id) : null;
          const company = sellMandate?.company_cnpj ? companyByCnpj.get(sellMandate.company_cnpj) : null;
          const buyer = pair.buyer_profile_id ? buyerById.get(pair.buyer_profile_id) : null;

          const sellerLabel = company?.codename ?? sellMandate?.company_cnpj ?? "Vendedor";
          const buyerLabel = buyer ? (buyer.company_name || buyer.buyer_name) : "Comprador";
          clientKey = `pair:${r.deal_pair_id}`;
          clientLabel = `${sellerLabel} ↔ ${buyerLabel}`;
          const setor = sellMandate?.setor;
          const uf = sellMandate?.uf ?? company?.uf;
          clientSubtitle = [setor, uf].filter(Boolean).join(" · ") || undefined;
        } else if (r.deal_id) {
          clientKey = `deal:${r.deal_id}`;
          clientLabel = `Deal ${r.deal_id.slice(0, 8)}`;
        }

        docs.push({
          id: `dd:${r.id}`,
          source: "deal_documents",
          category: r.category ?? "other",
          label: r.label ?? r.template_code ?? "Documento",
          status: r.status ?? "draft",
          homologation_status: r.homologation_status,
          ai_provider: r.ai_provider,
          ai_model: r.ai_model,
          critique_score: r.critique_score,
          version_number: r.version_number,
          storage_path: r.storage_path,
          has_body: !!r.generated_body,
          created_at: r.created_at,
          signed_at: r.signed_at,
          uploaded_by: r.uploaded_by,
          client_key: clientKey,
          client_label: clientLabel,
          client_subtitle: clientSubtitle,
          deal_pair_id: r.deal_pair_id,
          deal_id: r.deal_id,
          mandate_id: mandateId,
        });
      }

      // 6. crm_documents (uploads CRM)
      const crm = await supabase
        .schema("equity_brain" as any)
        .from("crm_documents" as any)
        .select("id, entity_type, entity_id, doc_kind, version, file_url, file_name, uploaded_by, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!crm.error) {
        // Resolver mandates referenciados
        const crmMandateIds = Array.from(
          new Set(
            ((crm.data ?? []) as any[])
              .filter((r) => r.entity_type === "mandate")
              .map((r) => r.entity_id)
          )
        );
        const extraMandates = crmMandateIds.filter((id) => !mandateByid.has(id));
        if (extraMandates.length) {
          const m2 = await supabase
            .schema("equity_brain" as any)
            .from("mandates" as any)
            .select("id, company_cnpj, setor, uf")
            .in("id", extraMandates);
          if (!m2.error) {
            for (const r of (m2.data ?? []) as any[]) mandateByid.set(r.id, r);
            const extraCnpjs = (m2.data ?? [])
              .map((r: any) => r.company_cnpj)
              .filter((c: string) => c && !companyByCnpj.has(c));
            if (extraCnpjs.length) {
              const c2 = await supabase
                .schema("equity_brain" as any)
                .from("companies" as any)
                .select("cnpj, codename, uf, municipio")
                .in("cnpj", extraCnpjs);
              if (!c2.error) for (const r of (c2.data ?? []) as any[]) companyByCnpj.set(r.cnpj, r);
            }
          }
        }

        for (const r of (crm.data ?? []) as any[]) {
          let clientKey = `${r.entity_type}:${r.entity_id}`;
          let clientLabel = `${r.entity_type === "mandate" ? "Mandato" : "Comprador"} ${String(r.entity_id).slice(0, 8)}`;
          let clientSubtitle: string | undefined;

          if (r.entity_type === "mandate" && mandateByid.has(r.entity_id)) {
            const mand = mandateByid.get(r.entity_id);
            const company = mand.company_cnpj ? companyByCnpj.get(mand.company_cnpj) : null;
            clientLabel = company?.codename ?? `Mandato ${String(r.entity_id).slice(0, 8)}`;
            clientSubtitle = [mand.setor, mand.uf ?? company?.uf].filter(Boolean).join(" · ") || undefined;
          }

          docs.push({
            id: `crm:${r.id}`,
            source: "crm_documents",
            category: r.doc_kind ?? "other",
            label: r.file_name ?? r.doc_kind ?? "Upload CRM",
            status: "uploaded",
            version_number: r.version,
            file_url: r.file_url,
            has_body: false,
            created_at: r.created_at,
            uploaded_by: r.uploaded_by,
            client_key: clientKey,
            client_label: clientLabel,
            client_subtitle: clientSubtitle,
            entity_type: r.entity_type,
            entity_id: r.entity_id,
            mandate_id: r.entity_type === "mandate" ? r.entity_id : null,
          });
        }
      }

      // Filtros locais
      const f = filters;
      const filtered = docs.filter((d) => {
        if (f.source && f.source !== "all" && d.source !== f.source) return false;
        if (f.category && f.category !== "all" && d.category !== f.category) return false;
        if (f.status && f.status !== "all" && d.status !== f.status) return false;
        if (f.clientKey && f.clientKey !== "all" && d.client_key !== f.clientKey) return false;
        if (f.search) {
          const q = f.search.toLowerCase();
          const hay = `${d.label} ${d.client_label} ${d.client_subtitle ?? ""} ${d.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // Agrupar por cliente
      const groupMap = new Map<string, LibraryGroup>();
      for (const d of filtered) {
        if (!groupMap.has(d.client_key)) {
          groupMap.set(d.client_key, {
            key: d.client_key,
            label: d.client_label,
            subtitle: d.client_subtitle,
            deal_pair_id: d.deal_pair_id ?? null,
            mandate_id: d.mandate_id ?? null,
            docs: [],
          });
        }
        groupMap.get(d.client_key)!.docs.push(d);
      }

      const groups = Array.from(groupMap.values()).sort((a, b) => {
        const aMax = Math.max(...a.docs.map((d) => +new Date(d.created_at)));
        const bMax = Math.max(...b.docs.map((d) => +new Date(d.created_at)));
        return bMax - aMax;
      });

      return { docs: filtered, groups };
    },
    staleTime: 30_000,
  });
}

export async function getDealDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("deal-documents")
    .createSignedUrl(storagePath, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getDealDocumentBody(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("deal_documents" as never)
    .select("generated_body")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).generated_body ?? null;
}
