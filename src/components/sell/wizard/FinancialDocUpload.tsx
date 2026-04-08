import { useState } from 'react';
import { FileUp, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialDocUploadProps {
  listingId?: string;
  onDocUploaded?: (fileUrl: string, fileName: string, fileType: string) => void;
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const ACCEPTED_EXTENSIONS = '.pdf,.xlsx,.xls,.csv';

export default function FinancialDocUpload({ listingId, onDocUploaded, pendingFile, onPendingFileChange }: FinancialDocUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; url: string; type: string } | null>(null);

  const getFileType = (file: File): string => {
    if (file.name.endsWith('.pdf')) return 'pdf';
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'xlsx';
    if (file.name.endsWith('.csv')) return 'csv';
    return 'unknown';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      toast.error('Formato não suportado. Use PDF, Excel ou CSV.');
      return;
    }

    // If no listingId yet, store as pending
    if (!listingId) {
      onPendingFileChange?.(file);
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!user) return;
    setUploading(true);

    try {
      const fileType = getFileType(file);
      const path = `${user.id}/${listingId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('financial-docs')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('financial-docs')
        .getPublicUrl(path);

      setUploadedDoc({ name: file.name, url: publicUrl, type: fileType });
      onDocUploaded?.(publicUrl, file.name, fileType);
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  // Expose upload method for post-listing creation
  (FinancialDocUpload as any).uploadPendingFile = uploadFile;

  return (
    <Card className="p-4 border-dashed border-2 border-accent/30 bg-accent/5">
      <div className="flex items-start gap-3 mb-3">
        <FileText className="w-5 h-5 text-accent mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm text-foreground">Documentos Financeiros (Privado)</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Upload de Balancete ou DRE. A IA irá analisar e gerar um Equity Score automaticamente.
            Aceita PDF, Excel ou CSV (máx. 10MB).
          </p>
        </div>
      </div>

      {uploadedDoc ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-foreground truncate">{uploadedDoc.name}</span>
          <Badge variant="outline" className="ml-auto">{uploadedDoc.type.toUpperCase()}</Badge>
        </div>
      ) : pendingFile ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-sm text-foreground truncate">{pendingFile.name}</span>
          <Badge variant="secondary" className="ml-auto">Pendente</Badge>
          <Button variant="ghost" size="sm" onClick={() => onPendingFileChange?.(null)}>
            Remover
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          ) : (
            <>
              <FileUp className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Clique para enviar</span>
              <span className="text-xs text-muted-foreground mt-1">PDF, Excel ou CSV</span>
            </>
          )}
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </Card>
  );
}
