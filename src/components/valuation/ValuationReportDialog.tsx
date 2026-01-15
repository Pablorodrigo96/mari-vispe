import { useRef } from 'react';
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
import { Download, X, ArrowLeft, TrendingUp, Building2, Calculator, BarChart3 } from 'lucide-react';
import { ValuationResult } from '@/lib/valuationCalculator';
import { formatFullCurrency } from '@/lib/formatters';
import jsPDF from 'jspdf';

interface ValuationReportDialogProps {
  open: boolean;
  onClose: () => void;
  onBackToStart: () => void;
  result: ValuationResult;
}

export const ValuationReportDialog = ({
  open,
  onClose,
  onBackToStart,
  result,
}: ValuationReportDialogProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatMultiple = (min: number, max: number) => `${min.toFixed(1)}x - ${max.toFixed(1)}x`;

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

    // Helper function
    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: [number, number, number] }) => {
      const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0] } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      doc.text(text, x, y);
    };

    // Header background
    doc.setFillColor(26, 32, 44); // Navy
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    addText('DEALFLOW', margin, 20, { fontSize: 24, fontStyle: 'bold', color: [212, 175, 55] }); // Gold
    addText('Laudo de Valuation por Múltiplos', margin, 32, { fontSize: 14, color: [255, 255, 255] });
    addText(`Emitido em ${formatDate(result.calculatedAt)}`, margin, 42, { fontSize: 10, color: [200, 200, 200] });

    yPos = 70;

    // Main Valuation Value
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 35, 3, 3, 'F');
    addText('VALOR ESTIMADO DA EMPRESA', margin + 5, yPos + 5, { fontSize: 10, color: [100, 100, 100] });
    addText(formatFullCurrency(result.valuation), margin + 5, yPos + 20, { fontSize: 22, fontStyle: 'bold', color: [26, 32, 44] });
    addText(`Faixa: ${formatFullCurrency(result.valuationMin)} - ${formatFullCurrency(result.valuationMax)}`, margin + 5, yPos + 28, { fontSize: 9, color: [100, 100, 100] });

    yPos += 45;

    // Company Info Section
    addText('DADOS DA EMPRESA', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + 40, yPos);
    yPos += 10;

    const companyInfo = [
      ['Empresa:', result.inputs.companyName],
      ['Segmento:', result.multiplesUsed.segment],
      ['Localização:', `${result.inputs.city}, ${result.inputs.state}`],
      ['Fundação:', `${result.inputs.foundingMonth}/${result.inputs.foundingYear}`],
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
      ['EBITDA/Lucro Líquido:', formatFullCurrency(result.metrics.ebitda)],
      ['Margem:', `${result.inputs.ebitdaPercentage}%`],
      ['Endividamento:', formatFullCurrency(result.inputs.totalDebt)],
    ];

    financialInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 45, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Multiples Used Section
    addText('MÚLTIPLOS UTILIZADOS', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 10;

    const multiplesInfo = [
      ['Segmento de Referência:', result.multiplesUsed.segment],
      ['EV/Receita:', formatMultiple(result.multiplesUsed.ev_revenue[0], result.multiplesUsed.ev_revenue[1])],
      ['EV/EBITDA:', formatMultiple(result.multiplesUsed.ev_ebitda[0], result.multiplesUsed.ev_ebitda[1])],
      ['P/L (Preço/Lucro):', formatMultiple(result.multiplesUsed.pe_ratio[0], result.multiplesUsed.pe_ratio[1])],
    ];

    multiplesInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 55, yPos, { fontSize: 10 });
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
    const colWidths = [45, 40, 40, 40];
    const headers = ['Método', 'Múltiplo', 'Valor Mín', 'Valor Máx'];
    let xPos = margin;

    doc.setFillColor(26, 32, 44);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

    headers.forEach((header, i) => {
      addText(header, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
      xPos += colWidths[i];
    });

    yPos += 8;

    // Table rows
    const breakdownRows = [
      ['EV/Receita', formatMultiple(result.evByRevenue.multipleMin, result.evByRevenue.multipleMax), formatFullCurrency(result.evByRevenue.min), formatFullCurrency(result.evByRevenue.max)],
      ['EV/EBITDA', formatMultiple(result.evByEbitda.multipleMin, result.evByEbitda.multipleMax), formatFullCurrency(result.evByEbitda.min), formatFullCurrency(result.evByEbitda.max)],
      ['P/L (Preço/Lucro)', formatMultiple(result.evByPE.multipleMin, result.evByPE.multipleMax), formatFullCurrency(result.evByPE.min), formatFullCurrency(result.evByPE.max)],
    ];

    breakdownRows.forEach((row) => {
      xPos = margin;
      row.forEach((cell, i) => {
        addText(cell, xPos + 2, yPos, { fontSize: 9 });
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    // Weighted average row
    xPos = margin;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    const avgRow = ['Média Ponderada', '30% / 40% / 30%', formatFullCurrency(result.valuationMin), formatFullCurrency(result.valuationMax)];
    avgRow.forEach((cell, i) => {
      addText(cell, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold' });
      xPos += colWidths[i];
    });

    yPos += 20;

    // Methodology
    addText('METODOLOGIA', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 35, yPos);
    yPos += 10;

    const methodologyText = `Este laudo utiliza o método de Valuation por Múltiplos de Mercado, que compara métricas financeiras da empresa com benchmarks do setor de ${result.multiplesUsed.segment} no mercado brasileiro (2024/2025). A média ponderada considera 30% EV/Receita, 40% EV/EBITDA e 30% P/L para balancear diferentes perspectivas de valor.`;

    const splitText = doc.splitTextToSize(methodologyText, pageWidth - 2 * margin);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(splitText, margin, yPos);

    yPos += splitText.length * 5 + 15;

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
    doc.setFillColor(26, 32, 44);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    addText('© DealFlow - Marketplace M&A', margin, pageHeight - 6, { fontSize: 8, color: [200, 200, 200] });
    addText('www.dealflow.com.br', pageWidth - margin - 35, pageHeight - 6, { fontSize: 8, color: [212, 175, 55] });

    // Save
    doc.save(`valuation-${result.inputs.companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-navy text-white -m-6 mb-0 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary" className="bg-gold/20 text-gold border-gold/30 mb-2">
                Laudo de Valuation por Múltiplos
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
          {/* Main Valuation */}
          <div className="bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Valor Estimado da Empresa</p>
            <p className="text-4xl font-bold text-foreground">
              {formatFullCurrency(result.valuation)}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Faixa: {formatFullCurrency(result.valuationMin)} - {formatFullCurrency(result.valuationMax)}
            </p>
          </div>

          {/* Grid with Company and Financial Data */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-gold" />
                </div>
                <h3 className="font-semibold text-foreground">Dados da Empresa</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">{result.inputs.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segmento</span>
                  <span className="font-medium">{result.multiplesUsed.segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Localização</span>
                  <span className="font-medium">{result.inputs.city}, {result.inputs.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fundação</span>
                  <span className="font-medium">{result.inputs.foundingMonth}/{result.inputs.foundingYear}</span>
                </div>
                {result.inputs.website && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Website</span>
                    <span className="font-medium">{result.inputs.website}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Data */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-gold" />
                </div>
                <h3 className="font-semibold text-foreground">Dados Financeiros</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faturamento Anual</span>
                  <span className="font-medium">{formatFullCurrency(result.metrics.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EBITDA / Lucro Líquido</span>
                  <span className="font-medium">{formatFullCurrency(result.metrics.ebitda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-medium">{result.inputs.ebitdaPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endividamento</span>
                  <span className="font-medium">{formatFullCurrency(result.inputs.totalDebt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ativos Tangíveis</span>
                  <span className="font-medium">{formatFullCurrency(result.inputs.tangibleAssets)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multiples Used */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-semibold text-foreground">Múltiplos de Mercado - {result.multiplesUsed.segment}</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">EV/Receita</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.ev_revenue[0], result.multiplesUsed.ev_revenue[1])}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">EV/EBITDA</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.ev_ebitda[0], result.multiplesUsed.ev_ebitda[1])}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">P/L (Preço/Lucro)</p>
                <p className="font-semibold text-lg">{formatMultiple(result.multiplesUsed.pe_ratio[0], result.multiplesUsed.pe_ratio[1])}</p>
              </div>
            </div>
          </div>

          {/* Valuation Breakdown Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-semibold text-foreground">Valuation por Método</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy">
                    <TableHead className="text-white">Método</TableHead>
                    <TableHead className="text-white">Peso</TableHead>
                    <TableHead className="text-white text-right">Valor Mínimo</TableHead>
                    <TableHead className="text-white text-right">Valor Máximo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">EV/Receita</TableCell>
                    <TableCell>30%</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByRevenue.min)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByRevenue.max)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">EV/EBITDA</TableCell>
                    <TableCell>40%</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByEbitda.min)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByEbitda.max)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">P/L (Preço/Lucro)</TableCell>
                    <TableCell>30%</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByPE.min)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.evByPE.max)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-gold/10 font-semibold">
                    <TableCell>Média Ponderada</TableCell>
                    <TableCell>100%</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.valuationMin)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.valuationMax)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-muted/30 border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Metodologia</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este laudo utiliza o método de <strong>Valuation por Múltiplos de Mercado</strong>, que compara métricas financeiras da empresa com benchmarks do setor de <strong>{result.multiplesUsed.segment}</strong> no mercado brasileiro (2024/2025). A média ponderada considera 30% EV/Receita, 40% EV/EBITDA e 30% P/L para balancear diferentes perspectivas de valor. O resultado final é ajustado pela dívida líquida da empresa.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Aviso Legal:</strong> Este documento é uma estimativa de valor baseada nas informações fornecidas pelo usuário e múltiplos de mercado. Não constitui uma oferta, proposta ou garantia de valor de mercado. Para transações de M&A, recomendamos a contratação de auditoria profissional e assessoria especializada.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border mt-6">
          <Button
            variant="outline"
            onClick={onBackToStart}
            className="sm:flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="bg-gold hover:bg-gold/90 text-gold-foreground sm:flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
