import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, ArrowLeft, TrendingUp, Building2, Calculator, BarChart3, MessageCircle, ArrowUpRight, BarChart2, TrendingDown, Target, Rocket, Info, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { ValuationResult, calculateEquityGap } from '@/lib/valuationCalculator';
import { formatFullCurrency } from '@/lib/formatters';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { DiagnosticAnswers, calculateTrueValue, calculateTrueValueLossMetrics, categoryLabels } from '@/lib/diagnosticCalculator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ValuationNarrativeReport } from './ValuationNarrativeReport';
import { ValuationDiagnostic } from './ValuationDiagnostic';

interface ValuationReportDialogProps {
  open: boolean;
  onClose: () => void;
  onBackToStart: () => void;
  result: ValuationResult;
  valuationId?: string;
}

export const ValuationReportDialog = ({
  open,
  onClose,
  onBackToStart,
  result,
  valuationId,
}: ValuationReportDialogProps) => {
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<DiagnosticAnswers | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const equityGap = calculateEquityGap(result, 2);

  const formatMultiple = (value: number) => `${value.toFixed(1)}x`;

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Mari brand palette
    const CARBON: [number, number, number] = [10, 10, 10];
    const GRAPHITE: [number, number, number] = [42, 42, 42];
    const VOLT: [number, number, number] = [217, 245, 100];
    const BONE: [number, number, number] = [250, 250, 247];
    const NEUTRAL: [number, number, number] = [238, 238, 236];
    const MUTED: [number, number, number] = [115, 115, 115];
    const LOSS_BG: [number, number, number] = [251, 234, 234];
    const LOSS_FG: [number, number, number] = [122, 31, 31];

    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: [number, number, number] }) => {
      const { fontSize = 10, fontStyle = 'normal', color = CARBON } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      doc.text(text, x, y);
    };

    // Bone background
    doc.setFillColor(...BONE);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header — Carbon
    doc.setFillColor(...CARBON);
    doc.rect(0, 0, pageWidth, 50, 'F');
    addText('mari', margin, 20, { fontSize: 24, fontStyle: 'bold', color: VOLT });
    addText('Market Approach — Valuation Relativo', margin, 32, { fontSize: 13, color: BONE });
    addText(`Emitido em ${formatDate(result.calculatedAt)}`, margin, 42, { fontSize: 9, color: [180, 180, 175] });

    yPos = 70;

    // Hero — Mashup Value (Carbon card with Volt accent line)
    doc.setFillColor(...CARBON);
    doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 42, 3, 3, 'F');
    doc.setFillColor(...VOLT);
    doc.rect(margin, yPos - 5, 3, 42, 'F');
    addText('MASHUP VALUE — VALOR DE MERCADO ESTIMADO', margin + 8, yPos + 4, { fontSize: 9, fontStyle: 'bold', color: [180, 180, 175] });
    addText(formatFullCurrency(result.mashupValue), margin + 8, yPos + 22, { fontSize: 26, fontStyle: 'bold', color: VOLT });
    addText(`Implícito: ${formatMultiple(result.impliedMultiples.impliedRevMultiple)} Receita · ${formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)} EBITDA`, margin + 8, yPos + 32, { fontSize: 9, color: BONE });

    yPos += 60;

    // Section helper
    const sectionTitle = (title: string) => {
      addText(title, margin, yPos, { fontSize: 11, fontStyle: 'bold', color: CARBON });
      yPos += 6;
      doc.setDrawColor(...VOLT);
      doc.setLineWidth(0.8);
      doc.line(margin, yPos, margin + 24, yPos);
      yPos += 8;
    };

    // Company Info
    sectionTitle('DADOS DA EMPRESA');
    const companyInfo = [
      ['Empresa', result.inputs.companyName],
      ['Tipo', result.inputs.companyType],
      ['Segmento', result.multiplesUsed.segment],
      ['Responsável', result.inputs.fullName],
      ['Email', result.inputs.email],
    ];
    companyInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 9, color: MUTED });
      addText(value, margin + 40, yPos, { fontSize: 9, fontStyle: 'bold', color: CARBON });
      yPos += 6;
    });

    yPos += 8;

    // Financial
    sectionTitle('DADOS FINANCEIROS');
    const financialInfo = [
      ['Faturamento Anual', formatFullCurrency(result.metrics.revenue)],
      ['Margem EBITDA', `${result.metrics.ebitdaMargin}%`],
      ['EBITDA Calculado', formatFullCurrency(result.metrics.ebitda)],
      ['Lucro Líquido', formatFullCurrency(result.metrics.netProfit)],
    ];
    financialInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 9, color: MUTED });
      addText(value, margin + 50, yPos, { fontSize: 9, fontStyle: 'bold', color: CARBON });
      yPos += 6;
    });

    yPos += 8;

    // Multiples
    sectionTitle(`MÚLTIPLOS DO SETOR — ${result.multiplesUsed.segment.toUpperCase()}`);
    const multiplesInfo = [
      ['EV/Receita', formatMultiple(result.multiplesUsed.rev)],
      ['EV/EBITDA', formatMultiple(result.multiplesUsed.ebitda)],
      ['P/Lucro', formatMultiple(result.multiplesUsed.profit)],
    ];
    multiplesInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 9, color: MUTED });
      addText(value, margin + 50, yPos, { fontSize: 9, fontStyle: 'bold', color: CARBON });
      yPos += 6;
    });

    // Page 2 — breakdown
    doc.addPage();
    doc.setFillColor(...BONE);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    yPos = margin;

    sectionTitle('VALUATION POR MÉTODO');

    const colWidths = [50, 35, 40, 45];
    const headers = ['Método', 'Múltiplo', 'Base', 'Valuation'];
    let xPos = margin;

    doc.setFillColor(...CARBON);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    headers.forEach((header, i) => {
      addText(header, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: BONE });
      xPos += colWidths[i];
    });
    yPos += 8;

    const breakdownRows = [
      ['EV/Receita', formatMultiple(result.multiplesUsed.rev), formatFullCurrency(result.metrics.revenue), formatFullCurrency(result.revenueValuation)],
      ['EV/EBITDA', formatMultiple(result.multiplesUsed.ebitda), formatFullCurrency(result.metrics.ebitda), formatFullCurrency(result.ebitdaValuation)],
      ['P/Lucro', formatMultiple(result.multiplesUsed.profit), formatFullCurrency(result.metrics.netProfit), formatFullCurrency(result.profitValuation)],
    ];

    breakdownRows.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...NEUTRAL);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
      }
      xPos = margin;
      row.forEach((cell, i) => {
        addText(cell, xPos + 2, yPos, { fontSize: 9, color: CARBON });
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    // Mashup row — Volt
    xPos = margin;
    doc.setFillColor(...VOLT);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    const avgRow = ['Mashup Value (Média)', `${result.validMethods} métodos`, '', formatFullCurrency(result.mashupValue)];
    avgRow.forEach((cell, i) => {
      addText(cell, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: CARBON });
      xPos += colWidths[i];
    });

    yPos += 18;

    sectionTitle('MÚLTIPLOS IMPLÍCITOS');
    [
      `EV/Receita: ${formatMultiple(result.impliedMultiples.impliedRevMultiple)}`,
      `EV/EBITDA: ${formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)}`,
      `P/Lucro: ${formatMultiple(result.impliedMultiples.impliedProfitMultiple)}`,
    ].forEach((text) => {
      addText(text, margin, yPos, { fontSize: 10, color: CARBON });
      yPos += 6;
    });

    yPos += 8;

    sectionTitle('METODOLOGIA');
    const methodologyText = `Este laudo utiliza Valuation por Múltiplos de Mercado (Market Approach), comparando métricas financeiras com benchmarks do setor de ${result.multiplesUsed.segment} no mercado brasileiro (2024/2025). O Mashup Value é calculado como a média dos métodos válidos: EV/Receita, EV/EBITDA e P/Lucro.`;
    const splitText = doc.splitTextToSize(methodologyText, pageWidth - 2 * margin);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAPHITE);
    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 5 + 12;

    // Gap de Equity
    sectionTitle('GAP DE EQUITY');
    const halfWidth = (pageWidth - 2 * margin - 10) / 2;

    // Atual
    doc.setFillColor(...NEUTRAL);
    doc.roundedRect(margin, yPos - 3, halfWidth, 25, 2, 2, 'F');
    addText('VALOR ATUAL', margin + 5, yPos + 3, { fontSize: 8, fontStyle: 'bold', color: MUTED });
    addText(formatFullCurrency(equityGap.currentValue), margin + 5, yPos + 14, { fontSize: 13, fontStyle: 'bold', color: CARBON });

    // Potencial — Volt
    doc.setFillColor(...VOLT);
    doc.roundedRect(margin + halfWidth + 10, yPos - 3, halfWidth, 25, 2, 2, 'F');
    addText('VALOR POTENCIAL', margin + halfWidth + 15, yPos + 3, { fontSize: 8, fontStyle: 'bold', color: CARBON });
    addText(formatFullCurrency(equityGap.potentialValue), margin + halfWidth + 15, yPos + 14, { fontSize: 13, fontStyle: 'bold', color: CARBON });

    yPos += 30;

    addText(`Gap: ${formatFullCurrency(equityGap.gapValue)}  (+${equityGap.gapPercent.toFixed(1)}%)`, margin, yPos, { fontSize: 11, fontStyle: 'bold', color: CARBON });
    yPos += 7;
    const gapExplanation = `Empresas atendidas pela mari conseguiram destravar este upside com trabalho estruturado de governança, fiscal e comercial.`;
    const splitGap = doc.splitTextToSize(gapExplanation, pageWidth - 2 * margin);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(splitGap, margin, yPos);
    yPos += splitGap.length * 5 + 12;

    // Disclaimer (neutro)
    doc.setFillColor(...NEUTRAL);
    doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, 22, 2, 2, 'F');
    addText('AVISO LEGAL', margin + 5, yPos + 3, { fontSize: 8, fontStyle: 'bold', color: GRAPHITE });
    const disclaimerText = 'Estimativa baseada nas informações fornecidas e múltiplos de mercado. Não constitui oferta ou garantia de valor. Recomendamos auditoria profissional para transações.';
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin - 10);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(splitDisclaimer, margin + 5, yPos + 9);

    // Footer
    doc.setFillColor(...CARBON);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    addText('© mari — Marketplace M&A', margin, pageHeight - 6, { fontSize: 8, color: [180, 180, 175] });
    addText('mari.vispe.com.br', pageWidth - margin - 35, pageHeight - 6, { fontSize: 8, color: VOLT });

    // PAGE 3 — Diagnostic
    if (diagnosticAnswers) {
      const degradation = calculateTrueValue(result, diagnosticAnswers);
      const lossMetrics = calculateTrueValueLossMetrics(result, degradation);

      doc.addPage();
      doc.setFillColor(...BONE);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header
      doc.setFillColor(...CARBON);
      doc.rect(0, 0, pageWidth, 40, 'F');
      addText('mari', margin, 18, { fontSize: 20, fontStyle: 'bold', color: VOLT });
      addText('DIAGNÓSTICO DE VALOR — True Value', margin, 30, { fontSize: 12, color: BONE });

      yPos = 55;

      // 3 Value Boxes
      const boxWidth = (pageWidth - 2 * margin - 10) / 3;

      // Estimado
      doc.setFillColor(...NEUTRAL);
      doc.roundedRect(margin, yPos, boxWidth, 28, 2, 2, 'F');
      addText('VALOR ESTIMADO', margin + 3, yPos + 8, { fontSize: 7, fontStyle: 'bold', color: MUTED });
      addText(formatFullCurrency(degradation.estimatedValue), margin + 3, yPos + 20, { fontSize: 11, fontStyle: 'bold', color: CARBON });

      // True Value (loss)
      doc.setFillColor(...LOSS_BG);
      doc.roundedRect(margin + boxWidth + 5, yPos, boxWidth, 28, 2, 2, 'F');
      addText('TRUE VALUE — HOJE', margin + boxWidth + 8, yPos + 8, { fontSize: 7, fontStyle: 'bold', color: LOSS_FG });
      addText(formatFullCurrency(degradation.trueValue), margin + boxWidth + 8, yPos + 20, { fontSize: 11, fontStyle: 'bold', color: LOSS_FG });

      // Potencial — Volt
      doc.setFillColor(...VOLT);
      doc.roundedRect(margin + (boxWidth + 5) * 2, yPos, boxWidth, 28, 2, 2, 'F');
      addText('VALOR POTENCIAL', margin + (boxWidth + 5) * 2 + 3, yPos + 8, { fontSize: 7, fontStyle: 'bold', color: CARBON });
      addText(formatFullCurrency(degradation.potentialValue), margin + (boxWidth + 5) * 2 + 3, yPos + 20, { fontSize: 11, fontStyle: 'bold', color: CARBON });

      yPos += 38;

      const totalPct = (degradation.totalDegradation * 100).toFixed(1);
      const totalLoss = degradation.estimatedValue - degradation.trueValue;
      addText(`Degradação Total: -${totalPct}%  (${formatFullCurrency(totalLoss)} perdidos)`, margin, yPos, { fontSize: 10, fontStyle: 'bold', color: LOSS_FG });
      yPos += 10;

      sectionTitle('DETALHAMENTO POR ITEM');

      const dColWidths = [65, 30, 20, 30];
      doc.setFillColor(...CARBON);
      doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 7, 'F');
      let dxPos = margin;
      ['Item', 'Categoria', 'Resp.', 'Impacto'].forEach((h, i) => {
        addText(h, dxPos + 2, yPos + 1, { fontSize: 8, fontStyle: 'bold', color: BONE });
        dxPos += dColWidths[i];
      });
      yPos += 8;

      degradation.itemBreakdown.forEach((row, idx) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          doc.setFillColor(...BONE);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          yPos = margin;
        }
        if (idx % 2 === 1) {
          doc.setFillColor(...NEUTRAL);
          doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 6, 'F');
        }
        const isNo = !row.answer;
        const textColor: [number, number, number] = isNo ? LOSS_FG : CARBON;
        const shortLabel = row.item.label.length > 55 ? row.item.label.substring(0, 52) + '...' : row.item.label;

        dxPos = margin;
        addText(shortLabel, dxPos + 2, yPos, { fontSize: 7.5, color: textColor });
        dxPos += dColWidths[0];
        addText(categoryLabels[row.item.category] || row.item.category, dxPos + 2, yPos, { fontSize: 7.5, color: MUTED });
        dxPos += dColWidths[1];
        addText(row.answer ? 'Sim' : 'Não', dxPos + 2, yPos, { fontSize: 7.5, fontStyle: 'bold', color: textColor });
        dxPos += dColWidths[2];
        addText(row.impact > 0 ? `-${formatFullCurrency(row.impact)}` : '—', dxPos + 2, yPos, { fontSize: 7.5, color: textColor });
        yPos += 6;
      });

      yPos += 8;

      const scoreLabels: Record<string, string> = { hot: 'HOT', warm: 'WARM', cold: 'COLD' };
      sectionTitle('LEAD SCORE');
      addText(scoreLabels[lossMetrics.leadScore] || lossMetrics.leadScore.toUpperCase(), margin, yPos, { fontSize: 14, fontStyle: 'bold', color: CARBON });
      addText(lossMetrics.leadScoreReason, margin + 30, yPos, { fontSize: 9, color: MUTED });
      yPos += 12;

      sectionTitle('GAP: TRUE VALUE → POTENCIAL');
      const barFullWidth = pageWidth - 2 * margin;
      const trueRatio = degradation.potentialValue > 0 ? degradation.trueValue / degradation.potentialValue : 0.5;
      const trueBarWidth = barFullWidth * trueRatio;
      const gapBarWidth = barFullWidth - trueBarWidth;

      doc.setFillColor(...LOSS_BG);
      doc.roundedRect(margin, yPos, trueBarWidth, 10, 1, 1, 'F');
      addText('True Value', margin + 2, yPos + 7, { fontSize: 7, fontStyle: 'bold', color: LOSS_FG });

      doc.setFillColor(...VOLT);
      doc.roundedRect(margin + trueBarWidth, yPos, gapBarWidth, 10, 1, 1, 'F');
      if (gapBarWidth > 30) {
        addText(`Gap: ${formatFullCurrency(degradation.gap)}`, margin + trueBarWidth + 2, yPos + 7, { fontSize: 7, fontStyle: 'bold', color: CARBON });
      }

      yPos += 18;
      addText(`True: ${formatFullCurrency(degradation.trueValue)}  →  Potencial: ${formatFullCurrency(degradation.potentialValue)}  (Gap: +${degradation.gapPercent.toFixed(1)}%)`, margin, yPos, { fontSize: 9, color: MUTED });

      // Footer
      doc.setFillColor(...CARBON);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      addText('© mari — Marketplace M&A', margin, pageHeight - 6, { fontSize: 8, color: [180, 180, 175] });
      addText('mari.vispe.com.br', pageWidth - margin - 35, pageHeight - 6, { fontSize: 8, color: VOLT });
    }

    doc.save(`valuation-${result.inputs.companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-[#0F172A] text-white -m-6 mb-0 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-2">
                Market Approach - Valuation Relativo
              </Badge>
              <DialogTitle className="text-2xl font-bold text-white">
                {result.inputs.companyName}
              </DialogTitle>
              <p className="text-white/70 text-sm mt-1">
                Emitido em {formatDate(result.calculatedAt)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div ref={reportRef} className="space-y-6 pt-6">
          {/* Main Valuation - Mashup Value */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-center text-white shadow-lg">
            <p className="text-white/95 text-sm mb-2 font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
              Mashup Value (Valor de Mercado Estimado)
            </p>
            <p className="text-4xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {formatFullCurrency(result.mashupValue)}
            </p>
            <p className="text-white/95 text-sm mt-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
              Implícito: {formatMultiple(result.impliedMultiples.impliedRevMultiple)} Receita | {formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)} EBITDA
            </p>
          </div>

          {/* Análise de Impacto Financeiro - DESTAQUE NO TOPO */}
          <div className="bg-gradient-to-br from-red-500/15 via-orange-500/10 to-red-500/5 border-2 border-red-400/40 dark:border-red-700/40 rounded-xl p-6 shadow-lg animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                ⚡ Antes de continuar: descubra seu valor real
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                O Mashup Value acima é apenas o <strong>ponto de partida</strong>. Em 90 segundos, respondendo 12 perguntas sobre fiscal, governança e operação, você descobre <strong className="text-red-600 dark:text-red-400">quanto a sua empresa está valendo de menos hoje</strong> — e o que precisa mudar para destravar o valor potencial.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-5 text-center">
              <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                <p className="text-2xl mb-1">📉</p>
                <p className="text-xs font-medium text-foreground">Quanto você perde por mês</p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                <p className="text-2xl mb-1">🎯</p>
                <p className="text-xs font-medium text-foreground">Itens que mais derrubam seu valor</p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                <p className="text-2xl mb-1">🚀</p>
                <p className="text-xs font-medium text-foreground">Plano de ação personalizado</p>
              </div>
            </div>
            <Button
              onClick={() => setDiagnosticOpen(true)}
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-md group"
            >
              <BarChart2 className="w-5 h-5 mr-2" />
              Iniciar Diagnóstico de Valor
              <ArrowUpRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Button>
          </div>

          {/* Grid with Company and Financial Data */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-foreground">Dados da Empresa</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">{result.inputs.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium capitalize">{result.inputs.companyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segmento</span>
                  <span className="font-medium">{result.multiplesUsed.segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável</span>
                  <span className="font-medium">{result.inputs.fullName}</span>
                </div>
              </div>
            </div>

            {/* Financial Data */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-foreground">Dados Financeiros</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faturamento Anual</span>
                  <span className="font-medium">{formatFullCurrency(result.metrics.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem EBITDA</span>
                  <span className="font-medium">{result.metrics.ebitdaMargin}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EBITDA Calculado</span>
                  <span className="font-medium">{formatFullCurrency(result.metrics.ebitda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro Líquido</span>
                  <span className="font-medium">{formatFullCurrency(result.metrics.netProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multiples Used */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-foreground">Múltiplos do Setor: {result.multiplesUsed.segment}</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">EV/Receita</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.rev)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">EV/EBITDA</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.ebitda)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">P/Lucro</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.profit)}</p>
              </div>
            </div>
          </div>

          {/* Valuation Breakdown Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-foreground">Valuation por Método</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#0F172A]">
                    <TableHead className="text-white">Método</TableHead>
                    <TableHead className="text-white">Múltiplo</TableHead>
                    <TableHead className="text-white text-right">Base</TableHead>
                    <TableHead className="text-white text-right">Valuation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">EV/Receita</TableCell>
                    <TableCell>{formatMultiple(result.multiplesUsed.rev)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.metrics.revenue)}</TableCell>
                    <TableCell className="text-right font-medium">{formatFullCurrency(result.revenueValuation)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">EV/EBITDA</TableCell>
                    <TableCell>{formatMultiple(result.multiplesUsed.ebitda)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.metrics.ebitda)}</TableCell>
                    <TableCell className="text-right font-medium">{formatFullCurrency(result.ebitdaValuation)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">P/Lucro</TableCell>
                    <TableCell>{formatMultiple(result.multiplesUsed.profit)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.metrics.netProfit)}</TableCell>
                    <TableCell className="text-right font-medium">{formatFullCurrency(result.profitValuation)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-500/10">
                    <TableCell className="font-bold text-emerald-600">Mashup Value (Média)</TableCell>
                    <TableCell className="text-emerald-600">{result.validMethods} métodos</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">{formatFullCurrency(result.mashupValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Implied Multiples Card */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-3">Múltiplos Implícitos (baseados no Mashup Value)</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-white/60 text-xs">Implícito EV/Receita</p>
                <p className="font-semibold text-lg text-emerald-400">{formatMultiple(result.impliedMultiples.impliedRevMultiple)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Implícito EV/EBITDA</p>
                <p className="font-semibold text-lg text-emerald-400">{formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Implícito P/Lucro</p>
                <p className="font-semibold text-lg text-emerald-400">{formatMultiple(result.impliedMultiples.impliedProfitMultiple)}</p>
              </div>
            </div>
          </div>

          {/* Gap de Equity - Enhanced */}
          {(() => {
            const boostedResult = {
              revenueValuation: result.metrics.revenue * result.multiplesUsed.rev,
              ebitdaValuation: result.metrics.revenue * (equityGap.boostedMargin / 100) * result.multiplesUsed.ebitda,
              profitValuation: result.profitValuation,
            };

            const chartData = [
              {
                name: 'EV/Receita',
                atual: result.revenueValuation,
                potencial: boostedResult.revenueValuation,
              },
              {
                name: 'EV/EBITDA',
                atual: result.ebitdaValuation,
                potencial: boostedResult.ebitdaValuation,
              },
              {
                name: 'P/Lucro',
                atual: result.profitValuation,
                potencial: boostedResult.profitValuation,
              },
              {
                name: 'Mashup',
                atual: equityGap.currentValue,
                potencial: equityGap.potentialValue,
              },
            ];

            const formatCompact = (value: number) => {
              if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
              if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
              return `R$ ${value.toFixed(0)}`;
            };

            const renderLabel = (props: any) => {
              const { x, y, width, value } = props;
              if (!value || value === 0) return null;
              return (
                <text x={x + width / 2} y={y - 6} fill="hsl(var(--foreground))" textAnchor="middle" fontSize={10} fontWeight={600}>
                  {formatCompact(value)}
                </text>
              );
            };

            return (
              <div className="bg-card border-2 border-emerald-500/30 rounded-xl p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-foreground">Gap de Equity</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs animate-pulse">
                    +{equityGap.gapPercent.toFixed(1)}%
                  </Badge>
                </div>

                {/* Summary cards */}
                <div className="grid sm:grid-cols-3 gap-3 mb-5">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Valor Atual</p>
                    <p className="text-xl font-bold text-foreground">{formatFullCurrency(equityGap.currentValue)}</p>
                    <p className="text-muted-foreground text-xs mt-1">EBITDA: {equityGap.currentMargin.toFixed(1)}%</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
                    <p className="text-emerald-600 text-[10px] uppercase tracking-wider mb-1">Valor Vispe</p>
                    <p className="text-xl font-bold text-emerald-600">{formatFullCurrency(equityGap.potentialValue)}</p>
                    <p className="text-emerald-600/70 text-xs mt-1">EBITDA: {equityGap.boostedMargin.toFixed(1)}%</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-3 text-center border border-accent/20">
                    <p className="text-accent text-[10px] uppercase tracking-wider mb-1">Gap</p>
                    <p className="text-xl font-bold text-accent">{formatFullCurrency(equityGap.gapValue)}</p>
                    <p className="text-accent/70 text-xs mt-1">+{equityGap.gapPercent.toFixed(1)}% de upside</p>
                  </div>
                </div>

                {/* Recharts bar chart */}
                <div className="bg-muted/30 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 text-center">Comparativo por Método</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatFullCurrency(value), name === 'atual' ? 'Valor Atual' : 'Valor Vispe']}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="atual" fill="#94a3b8" radius={[4, 4, 0, 0]} animationDuration={800} animationBegin={200}>
                        <LabelList dataKey="atual" content={renderLabel} />
                      </Bar>
                      <Bar dataKey="potencial" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} animationBegin={500}>
                        <LabelList dataKey="potencial" content={renderLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                      <span className="text-[10px] text-muted-foreground">Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                      <span className="text-[10px] text-muted-foreground">Vispe (Potencial)</span>
                    </div>
                  </div>
                </div>

                {/* Animated progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Valor Atual</span>
                    <span>Valor Vispe</span>
                  </div>
                  <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((equityGap.currentValue / equityGap.potentialValue) * 100, 100)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-full"
                      style={{ width: '100%' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
                      Gap: {formatFullCurrency(equityGap.gapValue)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Este é o seu <strong>Gap de Equity</strong> hoje. Empresas atendidas pela mari conseguiram destravar este upside com um trabalho estruturado de governança, fiscal e comercial. <strong className="text-foreground">Quer entender o que falta na sua?</strong>
                </p>

                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={async () => {
                    const opened = await openWhatsApp(`Olá! Vi meu Gap de Equity de ${formatFullCurrency(equityGap.gapValue)} e gostaria de falar com um especialista mari.`);
                    if (!opened) {
                      toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com um especialista
                </Button>
              </div>
            );
          })()}

          {/* Methodology */}
          <div className="bg-muted/30 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-2">Metodologia</h3>
            <p className="text-sm text-muted-foreground">
              Este laudo utiliza o método de Valuation por Múltiplos de Mercado (Market Approach), 
              comparando métricas financeiras da empresa com benchmarks do setor de {result.multiplesUsed.segment} 
              no mercado brasileiro (2024/2025). O <strong>Mashup Value</strong> é calculado como a média 
              dos métodos válidos: EV/Receita, EV/EBITDA e P/Lucro.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Aviso Legal:</strong> Este documento é uma estimativa de valor baseada nas 
              informações fornecidas e múltiplos de mercado. Não constitui oferta ou garantia de valor. 
              Recomendamos auditoria profissional para transações.
            </p>
          </div>

          {/* Análise de Impacto agora aparece no topo, abaixo do Mashup Value */}

          {/* CTA WhatsApp */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <h3 className="font-semibold text-foreground mb-2">
              Quer um Valuation mais preciso?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fale com nossos especialistas para um projeto consultivo exclusivo com análise aprofundada do seu negócio.
            </p>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={async () => {
                const opened = await openWhatsApp('Olá! Gostaria de saber mais sobre um Valuation consultivo para minha empresa.');
                if (!opened) {
                  toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
                }
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Falar com Especialista
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button
              onClick={onBackToStart}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Novo Valuation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Diagnostic Dialog */}
    <Dialog open={diagnosticOpen} onOpenChange={setDiagnosticOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Diagnóstico de Valor</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[90vh]">
          <ValuationDiagnostic onComplete={(answers) => {
            setDiagnosticAnswers(answers);
            setDiagnosticOpen(false);
            setNarrativeOpen(true);
          }} />
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* Narrative Report Dialog */}
    {diagnosticAnswers && (
      <Dialog open={narrativeOpen} onOpenChange={setNarrativeOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Análise de Impacto Financeiro</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[90vh]">
            <ValuationNarrativeReport result={result} valuationId={valuationId} diagnosticAnswers={diagnosticAnswers} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};
