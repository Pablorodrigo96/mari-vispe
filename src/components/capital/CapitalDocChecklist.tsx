import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DOC_TYPES = [
  { key: 'contrato_social', label: 'Contrato Social' },
  { key: 'balancete', label: 'Balancete' },
  { key: 'dre', label: 'DRE' },
  { key: 'comprovante_faturamento', label: 'Comprovante de Faturamento' },
];

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
    const path = `${user.id}/${requestId}/${docType}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('financial-docs').upload(path, file);
    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('financial-docs').getPublicUrl(path);
    await supabase.from('capital_documents').insert({
      request_id: requestId,
      doc_type: docType,
      file_url: urlData.publicUrl,
      uploaded_by: user.id,
      status: 'pending',
    });
    toast({ title: 'Documento enviado!' });
    setUploading(null);
    fetchDocs();
  };

  const getDocStatus = (docType: string) => {
    const doc = docs.find(d => d.doc_type === docType);
    if (!doc) return null;
    return doc.status;
  };

  const statusIcon = (status: string | null) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rejected') return <AlertCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    uploaded: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground text-lg">Documentos</h3>
      <div className="space-y-3">
        {DOC_TYPES.map(dt => {
          const status = getDocStatus(dt.key);
          return (
            <div key={dt.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {status ? statusIcon(status) : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">{dt.label}</span>
              </div>
              {status ? (
                <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
                  {statusLabel[status] || status}
                </Badge>
              ) : (
                <Button
                  size="sm" variant="outline"
                  disabled={uploading === dt.key}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.jpg,.png,.xlsx';
                    input.onchange = (e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) handleUpload(dt.key, f);
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploading === dt.key ? 'Enviando...' : 'Enviar'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {docs.length}/{DOC_TYPES.length} documentos enviados
      </p>
    </div>
  );
}
