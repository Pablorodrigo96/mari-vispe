import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LegalTemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "currency" | "cnpj" | "date";
  required?: boolean;
  default?: string | number;
}

export interface LegalTemplate {
  id: string;
  code: string;
  label: string;
  category: string;
  description: string | null;
  ai_instructions: string | null;
  customizable_fields: LegalTemplateField[];
  static_clauses: { id: string; title: string; mandatory: boolean }[];
  preferred_model: string | null;
  is_active: boolean;
}

export interface LegalDocument {
  id: string;
  deal_id: string;
  template_code: string | null;
  label: string;
  category: string;
  generated_body: string | null;
  custom_fields_snapshot: Record<string, any>;
  version_number: number;
  parent_version_id: string | null;
  requires_partner_approval: boolean;
  partner_approved_at: string | null;
  partner_approved_by: string | null;
  partner_comments: string | null;
  homologation_status: "none" | "pending" | "approved" | "rejected" | "changes_requested";
  ai_provider: string | null;
  ai_model: string | null;
  ai_fallback_used: boolean;
  status: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Homologation {
  id: string;
  document_id: string;
  lawyer_name: string;
  lawyer_email: string;
  access_token: string;
  sent_at: string;
  viewed_at: string | null;
  decision: string | null;
  comments: string | null;
  decided_at: string | null;
  expires_at: string;
}

export interface InternalSignature {
  id: string;
  document_id: string;
  signer_email: string;
  signer_name: string;
  signer_role: string;
  sign_token: string;
  requested_at: string;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string;
}

export function useLegalTemplates(category?: string) {
  return useQuery({
    queryKey: ["legal-templates", category],
    queryFn: async () => {
      let q = supabase
        .from("doc_templates" as any)
        .select(
          "id,code,label,category,description,ai_instructions,customizable_fields,static_clauses,preferred_model,is_active",
        )
        .eq("is_active", true);
      if (category) q = q.eq("category", category);
      const { data, error } = await q.order("label");
      if (error) throw error;
      return (data ?? []) as unknown as LegalTemplate[];
    },
  });
}

export function useLegalDocuments(dealId?: string | null) {
  return useQuery({
    queryKey: ["legal-documents", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_documents" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .not("generated_body", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LegalDocument[];
    },
  });
}

export function useGenerateLegalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      deal_id: string;
      template_code: string;
      custom_fields: Record<string, any>;
      parent_version_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("mari-generate-document", {
        body: args,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; document: LegalDocument; ai: any };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["legal-documents", vars.deal_id] });
    },
  });
}

export function usePartnerApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { document_id: string; comments?: string; deal_id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("deal_documents" as any)
        .update({
          partner_approved_at: new Date().toISOString(),
          partner_approved_by: u.user?.id ?? null,
          partner_comments: args.comments ?? null,
        } as any)
        .eq("id", args.document_id);
      if (error) throw error;
      await supabase.from("audit_events" as any).insert({
        event_type: "legal_document_partner_approved",
        entity_type: "legal_document",
        entity_id: args.document_id,
        actor_user_id: u.user?.id ?? null,
        payload: { comments: args.comments ?? null },
      } as any);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["legal-documents", vars.deal_id] });
    },
  });
}

export function useHomologations(documentId?: string | null) {
  return useQuery({
    queryKey: ["legal-homologations", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_homologations" as any)
        .select("*")
        .eq("document_id", documentId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Homologation[];
    },
  });
}

export function useSendHomologation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      document_id: string;
      lawyer_name: string;
      lawyer_email: string;
      deal_id?: string;
    }) => {
      const base = window.location.origin;
      const { data, error } = await supabase.functions.invoke("legal-homologation-send", {
        body: {
          document_id: args.document_id,
          lawyer_name: args.lawyer_name,
          lawyer_email: args.lawyer_email,
          public_base_url: base,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: true; homologation: Homologation; public_url: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["legal-homologations", vars.document_id] });
      qc.invalidateQueries({ queryKey: ["legal-documents", vars.deal_id] });
    },
  });
}

export function useInternalSignatures(documentId?: string | null) {
  return useQuery({
    queryKey: ["internal-signatures", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_signatures" as any)
        .select("*")
        .eq("document_id", documentId!)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InternalSignature[];
    },
  });
}

export function useRequestInternalSignatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      document_id: string;
      signers: { email: string; name: string; role: InternalSignature["signer_role"] }[];
      deal_id?: string;
    }) => {
      const base = window.location.origin;
      const { data, error } = await supabase.functions.invoke("legal-signature-request", {
        body: {
          document_id: args.document_id,
          signers: args.signers,
          public_base_url: base,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        ok: true;
        signatures: { id: string; signer_name: string; signer_email: string; public_url: string }[];
      };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["internal-signatures", vars.document_id] });
      qc.invalidateQueries({ queryKey: ["legal-documents", vars.deal_id] });
    },
  });
}
