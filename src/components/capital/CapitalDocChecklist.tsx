import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Sparkles } from 'lucide-react';
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

const ALL_DOCS = [...DOC_TYPES, ...OPTIONAL_DOC_TYPES.map(d => ({ ...d, required: false }))];

const ACCEPTED_FILES = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.doc,.docx,.zip,.rar,.txt,.xml';

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

interface Doc {
  id: string;
  doc_type: string;
  file_url: string;
  status: string | null;
}

interface Props {
  requestId: string;
}

export function CapitalDocChecklist({ requestId }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from('capital_documents')
      .select('id, doc_type, file_url, status')
      .eq('request_id', requestId);
    if (data) setDocs(data);
  }, [requestId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploading(docType);
    const safeName = sanitizeFileName(file.name);
    const path = `${user.id}/${requestId}/${docType}_${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('financial-docs').upload(path, file);
    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }
    await supabase.from('capital_documents').insert({
      request_id: requestId,
      doc_type: docType,
      file_url: path,
      uploaded_by: user.id,
      status: 'uploaded',
    });
    toast({ title: 'Documento enviado com sucesso!' });
    setUploading(null);
    fetchDocs();
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

  const statusIcon = (status: string | null) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rejected') return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (status === 'uploaded') return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    uploaded: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
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
    return (
      <div key={dt.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          {status ? statusIcon(status) : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">
            {dt.label}
            {isOptional && <span className="text-xs text-muted-foreground ml-1">(opcional)</span>}
          </span>
        </div>
        {status ? (
          <Badge variant={statusVariant(status)}>
            {statusLabel[status] || status}
          </Badge>
        ) : (
          <Button
            size="sm" variant="outline"
            disabled={uploading === dt.key}
            onClick={() => triggerUpload(dt.key)}
          >
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
          <p className="text-sm font-medium text-foreground">Quanto mais documentos, maior sua chance de aprovação!</p>
        </div>
        <p className="text-xs text-muted-foreground">Empresas que enviam documentação completa têm até 3x mais chances de match com investidores.</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Documentos obrigatórios</span>
          <span>{requiredSent}/{DOC_TYPES.length}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="space-y-2">
        {DOC_TYPES.map(dt => renderDocRow(dt))}
      </div>

      {progressPercent < 100 && (
        <p className="text-xs text-amber-600 font-medium">
          ⚡ Envie todos os documentos obrigatórios para acelerar sua análise!
        </p>
      )}

      <div className="pt-2 border-t">
        <p className="text-sm font-medium text-foreground mb-2">Documentos opcionais (aumentam seu score)</p>
        <div className="space-y-2">
          {OPTIONAL_DOC_TYPES.map(dt => renderDocRow(dt, true))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {totalSent} documento{totalSent !== 1 ? 's' : ''} enviado{totalSent !== 1 ? 's' : ''} no total
      </p>
    </div>
  );
}
