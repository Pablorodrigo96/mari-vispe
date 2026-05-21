import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/services/audit/auditService';

export type ProspectSide = 'buy' | 'sell';
export type ProspectStatus =
  | 'new'
  | 'letter_queued'
  | 'letter_sent'
  | 'letter_delivered'
  | 'contacted'
  | 'meeting_scheduled'
  | 'mandate_signed'
  | 'no_response'
  | 'declined'
  | 'archived';
export type ProspectSource =
  | 'outbound'
  | 'cfo_referral'
  | 'partner_referral'
  | 'inbound'
  | 'event'
  | 'other';

export interface ProspectContact {
  id: string;
  owner_advisor_id: string;
  side: ProspectSide;
  contact_name: string;
  contact_first_name: string | null;
  company_name: string;
  cnpj: string | null;
  city: string;
  state: string;
  sector: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  postal_address: string | null;
  postal_zipcode: string | null;
  status: ProspectStatus;
  source: ProspectSource;
  source_notes: string | null;
  converted_to_mandate_id: string | null;
  converted_at: string | null;
  notes: string | null;
  tags: string[];
  last_contact_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectFilters {
  side?: ProspectSide | 'all';
  status?: ProspectStatus | 'all';
  sector?: string;
  search?: string;
}

const PAGE_SIZE = 50;

export function useProspectContacts(filters: ProspectFilters, page = 0) {
  return useQuery({
    queryKey: ['prospect-contacts', filters, page],
    queryFn: async () => {
      let q = (supabase as any)
        .from('prospect_contacts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.side && filters.side !== 'all') q = q.eq('side', filters.side);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.sector) q = q.ilike('sector', `%${filters.sector}%`);
      if (filters.search) {
        const s = filters.search;
        q = q.or(
          `contact_name.ilike.%${s}%,company_name.ilike.%${s}%,city.ilike.%${s}%,cnpj.ilike.%${s}%`,
        );
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as ProspectContact[], count: count ?? 0 };
    },
  });
}

export function useCreateProspectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<
        ProspectContact,
        | 'id'
        | 'owner_advisor_id'
        | 'contact_first_name'
        | 'created_at'
        | 'updated_at'
        | 'converted_at'
        | 'converted_to_mandate_id'
        | 'last_contact_at'
      > & { owner_advisor_id?: string },
    ) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Não autenticado');

      const { data, error } = await (supabase as any)
        .from('prospect_contacts')
        .insert({ ...input, owner_advisor_id: uid })
        .select()
        .single();
      if (error) throw error;

      void logAuditEvent({
        entityType: 'company',
        entityId: data.id,
        eventType: 'prospect_contact_created',
        payload: { side: data.side, state: data.state, sector: data.sector },
      });
      return data as ProspectContact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospect-contacts'] }),
  });
}

export function useUpdateProspectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ProspectStatus }) => {
      const { error } = await (supabase as any)
        .from('prospect_contacts')
        .update({ status })
        .in('id', ids);
      if (error) throw error;

      void logAuditEvent({
        entityType: 'company',
        eventType: 'prospect_contact_bulk_status_change',
        payload: { ids, status, count: ids.length },
      });
      return { ids, status };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospect-contacts'] }),
  });
}

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: 'Novo',
  letter_queued: 'Fila carta',
  letter_sent: 'Carta enviada',
  letter_delivered: 'Carta entregue',
  contacted: 'Contatado',
  meeting_scheduled: 'Reunião agendada',
  mandate_signed: 'Mandato assinado',
  no_response: 'Sem retorno',
  declined: 'Recusou',
  archived: 'Arquivado',
};

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  outbound: 'Outbound',
  cfo_referral: 'Indicação CFO',
  partner_referral: 'Indicação parceiro',
  inbound: 'Inbound',
  event: 'Evento',
  other: 'Outro',
};

export const PAGE_SIZE_PROSPECT = PAGE_SIZE;
