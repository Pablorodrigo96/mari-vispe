import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DOC_TYPES = [
  { key: 'contrato_social', label: 'Contrato Social', required: true },
  { key: 'balancete', label: 'Balancete', required: true },
  { key: 'dre', label: 'DRE', required: true },
  { key: 'comprovante_faturamento', label: 'Comprovante de Faturamento', required: true },
];

const OPTIONAL_DOC_TYPES = [
  { key: 'irpj', label: 'IRPJ / DEFIS' },
  { key: 'certidao_negativa', label: 'Certidão Negativa de Débitos' },
  { key: 'extratos_bancarios', label: 'Extratos Bancários (últimos 6 meses)' },
  { key: 'relatorio_vendas', label: 'Relatório de Vendas' },
];

const ACCEPTED_FILES = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.doc,.docx,.zip,.rar,.txt,.xml';

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

interface DocRow {
  id: string;
  doc_type: string;
  file_url: string;
  status: string | null;
  source_doc_id?: string | null;
}

export type DocScope = 'capital' | 'listing';

interface Props {
  scope: DocScope;
  entityId: string;
  onDocsChange?: (count: number) => void;
}

/**
 * Unified document checklist used by both capital requests and listings.
 * When a doc is uploaded, it is automatically mirrored to ALL the user's
 * other listings and capital requests so they share the same dossier.
 */
export function EntityDocChecklist({ scope, entityId, onDocsChange }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const tableName = scope === 'capital' ? 'capital_documents' : 'listing_financial_docs';
  const entityFk = scope === 'capital' ? 'request_id' : 'listing_id';

  const fetchDocs = useCallback(async () => {
    const sel = scope === 'capital'
      ? 'id, doc_type, file_url, status, source_doc_id'
      : 'id, doc_type, file_url, status, source_doc_id';
    const { data } = await (supabase as any)
      .from(tableName)
      .select(sel)
      .eq(entityFk, entityId);
    if (data) setDocs(data as DocRow[]);
  }, [scope, entityId, tableName, entityFk]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  /** Mirror upload across all other listings + capital requests of the user. */
  const mirrorAcrossEntities = async (sourceDocId: string, docType: string, fileUrl: string) => {
    if (!user) return;

    // 1) Mirror to all OTHER capital_requests of the user (active)
    const { data: requests } = await supabase
      .from('capital_requests')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'closed');

    const targetCapitalIds = (requests || []).map(r => r.id).filter(id => !(scope === 'capital' && id === entityId));
    if (targetCapitalIds.length) {
      // dedup
      const { data: existing } = await supabase
        .from('capital_documents')
        .select('request_id')
        .eq('doc_type', docType)
        .eq('file_url', fileUrl)
        .in('request_id', targetCapitalIds);
      const have = new Set((existing || []).map(e => e.request_id));
      const rows = targetCapitalIds.filter(id => !have.has(id)).map(id => ({
        request_id: id,
        doc_type: docType,
        file_url: fileUrl,
        uploaded_by: user.id,
        status: 'uploaded',
        source_doc_id: sourceDocId,
      }));
      if (rows.length) await supabase.from('capital_documents').insert(rows);
    }

    // 2) Mirror to all OTHER listings of the user (pending or active)
    const { data: listings } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'active']);

    const targetListingIds = (listings || []).map(l => l.id).filter(id => !(scope === 'listing' && id === entityId));
    if (targetListingIds.length) {
      const { data: existing } = await supabase
        .from('listing_financial_docs')
        .select('listing_id')
        .eq('doc_type', docType)
        .eq('file_url', fileUrl)
        .in('listing_id', targetListingIds);
      const have = new Set((existing || []).map(e => e.listing_id));
      const rows = targetListingIds.filter(id => !have.has(id)).map(id => ({
        listing_id: id,
        user_id: user.id,
        doc_type: docType,
        file_url: fileUrl,
        file_name: fileUrl.split('/').pop() || null,
        status: 'uploaded',
        source_doc_id: sourceDocId,
      }));
      if (rows.length) await supabase.from('listing_financial_docs').insert(rows);
    }
  };

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploading(docType);
    const safeName = sanitizeFileName(file.name);
    const path = `${user.id}/shared/${docType}_${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('financial-docs').upload(path, file);
    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }

    // Insert into current entity scope
    let inserted: { id: string } | null = null;
    if (scope === 'capital') {
      const { data, error } = await supabase.from('capital_documents').insert({
        request_id: entityId,
        doc_type: docType,
        file_url: path,
        uploaded_by: user.id,
        status: 'uploaded',
      }).select('id').single();
      if (error) {
        toast({ title: 'Erro ao registrar documento', description: error.message, variant: 'destructive' });
        setUploading(null);
        return;
      }
      inserted = data;
    } else {
      const { data, error } = await supabase.from('listing_financial_docs').insert({
        listing_id: entityId,
        user_id: user.id,
        doc_type: docType,
        file_url: path,
        file_name: safeName,
        file_type: file.type,
        status: 'uploaded',
      }).select('id').single();
      if (error) {
        toast({ title: 'Erro ao registrar documento', description: error.message, variant: 'destructive' });
        setUploading(null);
        return;
      }
      inserted = data;
    }

    // Mirror across other entities
    if (inserted) {
      try {
        await mirrorAcrossEntities(inserted.id, docType, path);
      } catch (e) {
        // non-fatal: primary upload succeeded
        console.warn('mirror failed', e);
      }
    }

    toast({
      title: 'Documento enviado!',
      description: 'Disponível em todos os seus anúncios e captações.',
    });
    setUploading(null);
    await fetchDocs();
    const { count } = await (supabase as any)
      .from(tableName).select('id', { count: 'exact', head: true }).eq(entityFk, entityId);
    onDocsChange?.(count ?? 0);
  };

  const triggerUpload = (docType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_FILES;
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleUpload(docType, f);
    };
    input.click();
  };

  const getDocStatus = (docType: string) => {
    const doc = docs.find(d => d.doc_type === docType);
    if (!doc) return null;
    return doc.status;
  };

  const isMirrored = (docType: string) => {
    const doc = docs.find(d => d.doc_type === docType);
    return !!doc?.source_doc_id;
  };

  const statusIcon = (status: string | null) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rejected') return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (status === 'uploaded') return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente', uploaded: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado',
  };

  const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    if (status === 'uploaded') return 'outline';
    return 'secondary';
  };

  const requiredSent = DOC_TYPES.filter(dt => getDocStatus(dt.key)).length;
  const totalSent = docs.length;
  const progressPercent = Math.round((requiredSent / DOC_TYPES.length) * 100);

  const renderDocRow = (dt: { key: string; label: string }, isOptional = false) => {
    const status = getDocStatus(dt.key);
    const canReupload = !status || status === 'pending' || status === 'rejected';
    const mirrored = isMirrored(dt.key);
    return (
      <div key={dt.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {status && status !== 'pending' ? statusIcon(status) : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
          <span className="text-sm font-medium text-foreground break-words">
            {dt.label}
            {isOptional && <span className="text-xs text-muted-foreground ml-1">(opcional)</span>}
            {mirrored && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw className="h-3 w-3" /> sincronizado
              </span>
            )}
          </span>
        </div>
        {status && !canReupload ? (
          <Badge variant={statusVariant(status)}>{statusLabel[status] || status}</Badge>
        ) : (
          <Button size="sm" variant="outline" disabled={uploading === dt.key} onClick={() => triggerUpload(dt.key)}>
            <Upload className="h-3 w-3 mr-1" />
            {uploading === dt.key ? 'Enviando...' : 'Enviar'}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-foreground text-lg">Documentos</h3>
      </div>

      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium text-foreground break-words">
            Quanto mais documentos, maior sua chance de aprovação!
          </p>
        </div>
        <p className="text-xs text-muted-foreground break-words">
          Documentos enviados aqui aparecem automaticamente em todas as suas captações e anúncios — você só precisa subir uma vez.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Documentos obrigatórios</span>
          <span>{requiredSent}/{DOC_TYPES.length}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="space-y-2">{DOC_TYPES.map(dt => renderDocRow(dt))}</div>

      {progressPercent < 100 && (
        <p className="text-xs text-amber-600 font-medium">
          ⚡ Envie todos os documentos obrigatórios para acelerar sua análise!
        </p>
      )}

      <div className="pt-2 border-t">
        <p className="text-sm font-medium text-foreground mb-2">Documentos opcionais (aumentam seu score)</p>
        <div className="space-y-2">{OPTIONAL_DOC_TYPES.map(dt => renderDocRow(dt, true))}</div>
      </div>

      <p className="text-xs text-muted-foreground">
        {totalSent} documento{totalSent !== 1 ? 's' : ''} enviado{totalSent !== 1 ? 's' : ''} no total
      </p>
    </div>
  );
}
