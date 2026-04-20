import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileCheck2, Clock, XCircle, Loader2, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VDRDocument {
  id: string;
  doc_category: string;
  doc_name: string;
  file_url: string;
  status: 'pending' | 'validated' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

const REQUIRED_CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: 'balanco', label: 'Balanço Patrimonial', description: 'Último balanço fechado' },
  { key: 'dre', label: 'DRE', description: 'Demonstrativo de resultados (12 meses)' },
  { key: 'contrato', label: 'Contrato Social', description: 'Última alteração consolidada' },
  { key: 'fluxo_caixa', label: 'Fluxo de Caixa', description: 'Últimos 12 meses' },
  { key: 'impostos', label: 'Impostos', description: 'Certidões negativas e DARFs' },
];

interface VDRUploaderProps {
  listingId: string;
  listingTitle?: string;
}

export function VDRUploader({ listingId, listingTitle }: VDRUploaderProps) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<VDRDocument[]>([]);
  const [readiness, setReadiness] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  const loadDocs = async () => {
    setLoading(true);
    const [docsRes, listingRes] = await Promise.all([
      supabase.from('vdr_documents').select('*').eq('listing_id', listingId).order('created_at', { ascending: false }),
      supabase.from('listings').select('vdr_readiness').eq('id', listingId).single(),
    ]);
    if (docsRes.data) setDocs(docsRes.data as VDRDocument[]);
    if (listingRes.data) setReadiness((listingRes.data as any).vdr_readiness ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [listingId]);

  const handleFileUpload = async (category: string, file: File) => {
    if (!user) return;
    setUploadingCategory(category);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${listingId}/${category}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('financial-docs').upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('financial-docs').getPublicUrl(path);

      const { error: insErr } = await supabase.from('vdr_documents').insert({
        listing_id: listingId,
        uploaded_by: user.id,
        doc_category: category,
        doc_name: file.name,
        file_url: publicUrl,
      });
      if (insErr) throw insErr;

      toast.success('Documento enviado! Aguardando validação.');
      await loadDocs();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar documento');
    } finally {
      setUploadingCategory(null);
    }
  };

  const getCategoryDocs = (category: string) => docs.filter(d => d.doc_category === category);
  const getCategoryStatus = (category: string): 'empty' | 'pending' | 'validated' | 'rejected' => {
    const items = getCategoryDocs(category);
    if (items.length === 0) return 'empty';
    if (items.some(i => i.status === 'validated')) return 'validated';
    if (items.some(i => i.status === 'pending')) return 'pending';
    return 'rejected';
  };

  const readinessColor = readiness === 100 ? 'text-emerald-400' : readiness >= 60 ? 'text-amber-400' : 'text-red-400';
  const readinessBg = readiness === 100 ? 'bg-emerald-500' : readiness >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Cofre Digital (VDR)
            {listingTitle && <span className="text-sm font-normal text-muted-foreground break-words">— {listingTitle}</span>}
          </CardTitle>
          {readiness === 100 && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              ✓ Pronto para a vitrine
            </Badge>
          )}
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Prontidão para venda</span>
            <span className={cn('font-bold', readinessColor)}>{readiness}%</span>
          </div>
          <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
            <div className={cn('h-full transition-all duration-500', readinessBg)} style={{ width: `${readiness}%` }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          REQUIRED_CATEGORIES.map((cat) => {
            const status = getCategoryStatus(cat.key);
            const items = getCategoryDocs(cat.key);
            return (
              <div key={cat.key} className="border border-slate-700/40 rounded-lg p-3 bg-slate-800/30">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground break-words">{cat.label}</span>
                      {status === 'validated' && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><FileCheck2 className="w-3 h-3" />Validado</Badge>}
                      {status === 'pending' && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1"><Clock className="w-3 h-3" />Em análise</Badge>}
                      {status === 'rejected' && <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1"><XCircle className="w-3 h-3" />Rejeitado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{cat.description}</p>
                    {items.length > 0 && (
                      <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {items.map(i => (
                          <li key={i.id} className="break-words">
                            • {i.doc_name}
                            {i.rejection_reason && <span className="text-red-400"> — {i.rejection_reason}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <input
                      id={`upload-${cat.key}`}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(cat.key, f);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      disabled={uploadingCategory === cat.key}
                      onClick={() => document.getElementById(`upload-${cat.key}`)?.click()}
                    >
                      {uploadingCategory === cat.key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <><Upload className="w-3 h-3 mr-1" />Enviar</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
