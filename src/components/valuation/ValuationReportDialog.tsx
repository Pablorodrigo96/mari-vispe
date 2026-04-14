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
import { Download, ArrowLeft, TrendingUp, Building2, Calculator, BarChart3, MessageCircle, ArrowUpRight, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { ValuationResult, calculateEquityGap } from '@/lib/valuationCalculator';
import { formatFullCurrency } from '@/lib/formatters';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ValuationNarrativeReport } from './ValuationNarrativeReport';

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
}: ValuationReportDialogProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const equityGap = calculateEquityGap(result, 5);

  const formatMultiple = (value: number) => `${value.toFixed(1)}x`;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
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

    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: [number, number, number] }) => {
      const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0] } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      doc.text(text, x, y);
    };

    // Header background
    doc.setFillColor(15, 23, 42); // Navy (#0F172A)
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    addText('PME.B3', margin, 20, { fontSize: 24, fontStyle: 'bold', color: [16, 185, 129] }); // Emerald
    addText('Market Approach - Valuation Relativo', margin, 32, { fontSize: 14, color: [255, 255, 255] });
    addText(`Emitido em ${formatDate(result.calculatedAt)}`, margin, 42, { fontSize: 10, color: [200, 200, 200] });

    yPos = 70;

    // Main Valuation - Mashup Value
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 40, 3, 3, 'F');
    addText('MASHUP VALUE (Valor de Mercado Estimado)', margin + 5, yPos + 5, { fontSize: 12, fontStyle: 'bold', color: [255, 255, 255] });
    addText(formatFullCurrency(result.mashupValue), margin + 5, yPos + 22, { fontSize: 26, fontStyle: 'bold', color: [255, 255, 255] });
    addText(`Implícito: ${formatMultiple(result.impliedMultiples.impliedRevMultiple)} Receita | ${formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)} EBITDA`, margin + 5, yPos + 32, { fontSize: 9, color: [220, 255, 240] });

    yPos += 55;

    // Company Info Section
    addText('DADOS DA EMPRESA', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + 45, yPos);
    yPos += 10;

    const companyInfo = [
      ['Empresa:', result.inputs.companyName],
      ['Tipo:', result.inputs.companyType],
      ['Segmento:', result.multiplesUsed.segment],
      ['Responsável:', result.inputs.fullName],
      ['Email:', result.inputs.email],
    ];

    companyInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 35, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Financial Data Section
    addText('DADOS FINANCEIROS', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 50, yPos);
    yPos += 10;

    const financialInfo = [
      ['Faturamento Anual:', formatFullCurrency(result.metrics.revenue)],
      ['Margem EBITDA:', `${result.metrics.ebitdaMargin}%`],
      ['EBITDA Calculado:', formatFullCurrency(result.metrics.ebitda)],
      ['Lucro Líquido:', formatFullCurrency(result.metrics.netProfit)],
    ];

    financialInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 45, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Multiples Used Section
    addText(`MÚLTIPLOS DO SETOR: ${result.multiplesUsed.segment}`, margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 60, yPos);
    yPos += 10;

    const multiplesInfo = [
      ['Múltiplo EV/Receita:', formatMultiple(result.multiplesUsed.rev)],
      ['Múltiplo EV/EBITDA:', formatMultiple(result.multiplesUsed.ebitda)],
      ['Múltiplo P/Lucro:', formatMultiple(result.multiplesUsed.profit)],
    ];

    multiplesInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 50, yPos, { fontSize: 10 });
      yPos += 6;
    });

    // New page for breakdown
    doc.addPage();
    yPos = margin;

    // Valuation Breakdown Table
    addText('VALUATION POR MÉTODO', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 10;

    // Table header
    const colWidths = [50, 35, 40, 45];
    const headers = ['Método', 'Múltiplo', 'Base', 'Valuation'];
    let xPos = margin;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

    headers.forEach((header, i) => {
      addText(header, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
      xPos += colWidths[i];
    });

    yPos += 8;

    // Table rows
    const breakdownRows = [
      ['EV/Receita', formatMultiple(result.multiplesUsed.rev), formatFullCurrency(result.metrics.revenue), formatFullCurrency(result.revenueValuation)],
      ['EV/EBITDA', formatMultiple(result.multiplesUsed.ebitda), formatFullCurrency(result.metrics.ebitda), formatFullCurrency(result.ebitdaValuation)],
      ['P/Lucro', formatMultiple(result.multiplesUsed.profit), formatFullCurrency(result.metrics.netProfit), formatFullCurrency(result.profitValuation)],
    ];

    breakdownRows.forEach((row) => {
      xPos = margin;
      row.forEach((cell, i) => {
        addText(cell, xPos + 2, yPos, { fontSize: 9 });
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    // Average row
    xPos = margin;
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    const avgRow = ['Mashup Value (Média)', `${result.validMethods} métodos`, '', formatFullCurrency(result.mashupValue)];
    avgRow.forEach((cell, i) => {
      addText(cell, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
      xPos += colWidths[i];
    });

    yPos += 20;

    // Implied Multiples
    addText('MÚLTIPLOS IMPLÍCITOS', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 45, yPos);
    yPos += 10;

    const impliedInfo = [
      [`Implícito EV/Receita: ${formatMultiple(result.impliedMultiples.impliedRevMultiple)}`],
      [`Implícito EV/EBITDA: ${formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)}`],
      [`Implícito P/Lucro: ${formatMultiple(result.impliedMultiples.impliedProfitMultiple)}`],
    ];

    impliedInfo.forEach(([text]) => {
      addText(text, margin, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Methodology
    addText('METODOLOGIA', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 35, yPos);
    yPos += 10;

    const methodologyText = `Este laudo utiliza o método de Valuation por Múltiplos de Mercado (Market Approach), comparando métricas financeiras da empresa com benchmarks do setor de ${result.multiplesUsed.segment} no mercado brasileiro (2024/2025). O Mashup Value é calculado como a média dos métodos válidos (EV/Receita, EV/EBITDA e P/Lucro).`;

    const splitText = doc.splitTextToSize(methodologyText, pageWidth - 2 * margin);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(splitText, margin, yPos);

    yPos += splitText.length * 5 + 15;

    // Gap de Equity Section
    addText('GAP DE EQUITY', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 35, yPos);
    yPos += 10;

    const halfWidth = (pageWidth - 2 * margin - 10) / 2;

    // Current Value box
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(margin, yPos - 3, halfWidth, 25, 2, 2, 'F');
    addText('Valor Atual', margin + 5, yPos + 3, { fontSize: 9, fontStyle: 'bold', color: [100, 100, 100] });
    addText(formatFullCurrency(equityGap.currentValue), margin + 5, yPos + 14, { fontSize: 14, fontStyle: 'bold', color: [50, 50, 50] });

    // Potential Value box
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + halfWidth + 10, yPos - 3, halfWidth, 25, 2, 2, 'F');
    addText('Valor Vispe (Potencial)', margin + halfWidth + 15, yPos + 3, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
    addText(formatFullCurrency(equityGap.potentialValue), margin + halfWidth + 15, yPos + 14, { fontSize: 14, fontStyle: 'bold', color: [255, 255, 255] });

    yPos += 30;

    addText(`Gap: ${formatFullCurrency(equityGap.gapValue)} (+${equityGap.gapPercent.toFixed(1)}%)`, margin, yPos, { fontSize: 11, fontStyle: 'bold', color: [16, 185, 129] });
    yPos += 8;
    const gapExplanation = `Se sua empresa melhorar a margem EBITDA em 5pp (de ${equityGap.currentMargin.toFixed(1)}% para ${equityGap.boostedMargin.toFixed(1)}%), o valor estimado sobe de ${formatFullCurrency(equityGap.currentValue)} para ${formatFullCurrency(equityGap.potentialValue)}.`;
    const splitGap = doc.splitTextToSize(gapExplanation, pageWidth - 2 * margin);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(splitGap, margin, yPos);

    yPos += splitGap.length * 5 + 15;

    // Disclaimer
    doc.setFillColor(255, 250, 230);
    doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, 25, 2, 2, 'F');
    addText('AVISO LEGAL', margin + 5, yPos + 3, { fontSize: 9, fontStyle: 'bold', color: [150, 100, 0] });
    const disclaimerText = 'Este documento é uma estimativa de valor baseada nas informações fornecidas e múltiplos de mercado. Não constitui oferta ou garantia de valor. Recomendamos auditoria profissional para transações.';
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin - 10);
    doc.setFontSize(8);
    doc.setTextColor(100, 80, 0);
    doc.text(splitDisclaimer, margin + 5, yPos + 10);

    // Footer
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    addText('© PME.B3 - Marketplace M&A', margin, pageHeight - 6, { fontSize: 8, color: [200, 200, 200] });
    addText('www.pmeb3.com.br', pageWidth - margin - 35, pageHeight - 6, { fontSize: 8, color: [16, 185, 129] });

    // Save
    doc.save(`valuation-${result.inputs.companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
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
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-center text-white">
            <p className="text-emerald-100 text-sm mb-2">Mashup Value (Valor de Mercado Estimado)</p>
            <p className="text-4xl font-bold">
              {formatFullCurrency(result.mashupValue)}
            </p>
            <p className="text-emerald-100 text-sm mt-3">
              Implícito: {formatMultiple(result.impliedMultiples.impliedRevMultiple)} Receita | {formatMultiple(result.impliedMultiples.impliedEbitdaMultiple)} EBITDA
            </p>
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
                  Se sua empresa melhorar a margem EBITDA em 5pp (de {equityGap.currentMargin.toFixed(1)}% para {equityGap.boostedMargin.toFixed(1)}%), 
                  o valor estimado sobe de {formatFullCurrency(equityGap.currentValue)} para {formatFullCurrency(equityGap.potentialValue)}.
                </p>

                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={async () => {
                    const opened = await openWhatsApp(`Olá! Vi meu Gap de Equity de ${formatFullCurrency(equityGap.gapValue)} e gostaria de falar com um franqueado Vispe na minha região.`);
                    if (!opened) {
                      toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com Franqueado Regional
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
  );
};
