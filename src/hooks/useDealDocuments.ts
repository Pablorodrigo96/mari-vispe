import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocTemplate {
  id: string;
  code: string;
  label: string;
  category: string;
  description: string | null;
  requires_signature: boolean;
  applies_to_stages: string[];
  storage_path: string | null;
  is_active: boolean;
}

export interface DealDocument {
  id: string;
  deal_id: string;
  stage_key: string | null;
  template_code: string | null;
  label: string;
  category: string;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: "draft" | "pending_signature" | "signed" | "archived";
  signature_provider: string | null;
  signature_request_id: string | null;
  signing_url: string | null;
  signed_at: string | null;
  signed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StageDocRequirement {
  id: string;
  stage_key: string;
  template_code: string;
  is_required: boolean;
  is_blocking: boolean;
  position: number;
  template?: DocTemplate;
}

export interface DealDocProgress {
  deal_id: string;
  stage_key: string;
  required_count: number;
  present_count: number;
  pending_blocking: number;
}

// ---------- Templates ----------
export function useDocTemplates(stageKey?: string | null) {
  return useQuery({
    queryKey: ["doc-templates", stageKey],
    queryFn: async (): Promise<DocTemplate[]> => {
      const { data, error } = await supabase
        .from("doc_templates" as never)
        .select("*")
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      const rows = (data ?? []) as unknown as DocTemplate[];
      if (!stageKey) return rows;
      return rows.filter((t) => !t.applies_to_stages?.length || t.applies_to_stages.includes(stageKey));
    },
  });
}

// ---------- Requirements ----------
export function useStageDocRequirements(stageKey?: string | null) {
  return useQuery({
    queryKey: ["stage-doc-requirements", stageKey],
    enabled: !!stageKey,
    queryFn: async (): Promise<StageDocRequirement[]> => {
      const { data, error } = await supabase
        .from("stage_doc_requirements" as never)
        .select("*, template:doc_templates(*)")
        .eq("stage_key", stageKey!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as StageDocRequirement[];
    },
  });
}

// ---------- Deal documents ----------
export function useDealDocuments(dealId?: string | null, stageKey?: string | null) {
  return useQuery({
    queryKey: ["deal-documents", dealId, stageKey],
    enabled: !!dealId,
    queryFn: async (): Promise<DealDocument[]> => {
      let q = supabase
        .from("deal_documents" as never)
        .select("*")
        .eq("deal_id", dealId!)
        .order("uploaded_at", { ascending: false });
      if (stageKey) q = q.eq("stage_key", stageKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DealDocument[];
    },
  });
}

export function useDealDocProgress(dealId?: string | null) {
  return useQuery({
    queryKey: ["deal-doc-progress", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<DealDocProgress[]> => {
      const { data, error } = await supabase
        .from("deal_doc_progress" as never)
        .select("*")
        .eq("deal_id", dealId!);
      if (error) throw error;
      return (data ?? []) as unknown as DealDocProgress[];
    },
  });
}

// ---------- Mutations ----------
export function useUploadDealDocument(dealId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      file: File;
      label: string;
      category?: string;
      stageKey?: string | null;
      templateCode?: string | null;
    }) => {
      if (!dealId) throw new Error("deal_id required");
      const { data: u } = await supabase.auth.getUser();
      const ts = Date.now();
      const safe = args.file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${dealId}/${args.stageKey ?? "geral"}/${ts}-${safe}`;
      const up = await supabase.storage.from("deal-documents").upload(path, args.file, {
        upsert: false,
        contentType: args.file.type || "application/octet-stream",
      });
      if (up.error) throw up.error;

      const { error } = await supabase.from("deal_documents" as never).insert({
        deal_id: dealId,
        stage_key: args.stageKey ?? null,
        template_code: args.templateCode ?? null,
        label: args.label,
        category: args.category ?? "other",
        storage_path: path,
        uploaded_by: u.user?.id ?? null,
        status: "draft",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-documents", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-doc-progress", dealId] });
    },
  });
}

export function useArchiveDealDocument(dealId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("deal_documents" as never)
        .update({ status: "archived" } as never)
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-documents", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-doc-progress", dealId] });
    },
  });
}

export function useRequestSignature(dealId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("clicksign-mock", {
        body: { action: "request-signature", document_id: documentId },
      });
      if (error) throw error;
      return data as { signature_request_id: string; signing_url: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-documents", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-doc-progress", dealId] });
    },
  });
}

export function useSimulateSign(dealId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("clicksign-mock", {
        body: { action: "simulate-sign", document_id: documentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-documents", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-doc-progress", dealId] });
    },
  });
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("deal-documents").createSignedUrl(storagePath, 300);
  if (error) {
    console.warn("[getSignedUrl]", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
