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
import { Download, X, ArrowLeft, TrendingUp, Building2, Calculator, FileText } from 'lucide-react';
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

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRecurrenceLabel = (value: string) => {
    const labels: Record<string, string> = {
      none: 'Nenhuma',
      partial: 'Parcial',
      moderate: 'Moderada',
      high: 'Alta',
    };
    return labels[value] || value;
  };

  const getDependencyLabel = (value: string) => {
    const labels: Record<string, string> = {
      totally: 'Totalmente dependente',
      partially: 'Parcialmente dependente',
      little: 'Pouco dependente',
      independent: 'Independente',
    };
    return labels[value] || value;
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
    addText('Laudo de Valuation', margin, 32, { fontSize: 14, color: [255, 255, 255] });
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
      ['Segmento:', result.inputs.segment],
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
      ['Faturamento Anual:', formatFullCurrency(result.inputs.annualRevenue)],
      ['Margem de Lucro Líquido:', `${result.inputs.ebitdaPercentage}%`],
      ['Ativos Tangíveis:', formatFullCurrency(result.inputs.tangibleAssets)],
      ['Endividamento:', formatFullCurrency(result.inputs.totalDebt)],
    ];

    financialInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 45, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Calculation Premises
    addText('PREMISSAS DO CÁLCULO', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 10;

    const premisesInfo = [
      ['Taxa de Desconto:', formatPercent(result.discountRate)],
      ['Taxa de Crescimento:', formatPercent(result.growthRate)],
      ['Crescimento Perpétuo:', formatPercent(result.perpetualGrowth)],
      ['Recorrência de Receita:', getRecurrenceLabel(result.inputs.revenueRecurrence)],
      ['Dependência do Fundador:', getDependencyLabel(result.inputs.founderDependency)],
    ];

    premisesInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 55, yPos, { fontSize: 10 });
      yPos += 6;
    });

    // New page for projections
    doc.addPage();
    yPos = margin;

    // Projections Table
    addText('PROJEÇÃO DE 3 ANOS', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 45, yPos);
    yPos += 10;

    // Table header
    const colWidths = [20, 35, 35, 35, 35];
    const headers = ['Ano', 'Faturamento', 'Lucro', 'FCF', 'VP'];
    let xPos = margin;

    doc.setFillColor(26, 32, 44);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

    headers.forEach((header, i) => {
      addText(header, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
      xPos += colWidths[i];
    });

    yPos += 8;

    // Table rows
    result.projections.forEach((proj) => {
      xPos = margin;
      const rowData = [
        `Ano ${proj.year}`,
        formatFullCurrency(proj.revenue),
        formatFullCurrency(proj.netProfit),
        formatFullCurrency(proj.fcf),
        formatFullCurrency(proj.presentValue),
      ];

      rowData.forEach((cell, i) => {
        addText(cell, xPos + 2, yPos, { fontSize: 9 });
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    // Terminal Value
    yPos += 5;
    addText('Valor Terminal:', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText(formatFullCurrency(result.terminalValue), margin + 35, yPos, { fontSize: 10 });
    yPos += 6;
    addText('VP do Valor Terminal:', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText(formatFullCurrency(result.terminalValuePV), margin + 45, yPos, { fontSize: 10 });

    yPos += 15;

    // Methodology
    addText('METODOLOGIA', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 35, yPos);
    yPos += 10;

    const methodologyText = `Este laudo utiliza o método de Fluxo de Caixa Descontado (DCF), que projeta os fluxos de caixa futuros da empresa e os traz a valor presente utilizando uma taxa de desconto que reflete o risco do negócio. O valor terminal considera um crescimento perpétuo de ${formatPercent(result.perpetualGrowth)} ao ano.`;

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
    const disclaimerText = 'Este documento é uma estimativa de valor baseada nas informações fornecidas e não constitui oferta ou garantia de valor de mercado. Recomendamos a contratação de auditoria profissional para transações.';
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
                Laudo de Valuation
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
                  <span className="font-medium">{result.inputs.segment}</span>
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
                  <span className="font-medium">{formatFullCurrency(result.inputs.annualRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem de Lucro Líquido</span>
                  <span className="font-medium">{result.inputs.ebitdaPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ativos Tangíveis</span>
                  <span className="font-medium">{formatFullCurrency(result.inputs.tangibleAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endividamento</span>
                  <span className="font-medium">{formatFullCurrency(result.inputs.totalDebt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Premises */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-semibold text-foreground">Premissas do Cálculo</h3>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Taxa de Desconto</p>
                <p className="font-semibold text-lg">{formatPercent(result.discountRate)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Taxa de Crescimento</p>
                <p className="font-semibold text-lg">{formatPercent(result.growthRate)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Crescimento Perpétuo</p>
                <p className="font-semibold text-lg">{formatPercent(result.perpetualGrowth)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Recorrência de Receita</p>
                <p className="font-semibold">{getRecurrenceLabel(result.inputs.revenueRecurrence)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Dependência do Fundador</p>
                <p className="font-semibold">{getDependencyLabel(result.inputs.founderDependency)}</p>
              </div>
            </div>
          </div>

          {/* 3-Year Projection Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-semibold text-foreground">Projeção de 3 Anos</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy">
                    <TableHead className="text-white">Ano</TableHead>
                    <TableHead className="text-white text-right">Faturamento</TableHead>
                    <TableHead className="text-white text-right">Lucro Líquido</TableHead>
                    <TableHead className="text-white text-right">FCF</TableHead>
                    <TableHead className="text-white text-right">Valor Presente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.projections.map((proj) => (
                    <TableRow key={proj.year}>
                      <TableCell className="font-medium">Ano {proj.year}</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.revenue)}</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.netProfit)}</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.fcf)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatFullCurrency(proj.presentValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-semibold">Valor Terminal</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(result.terminalValue)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatFullCurrency(result.terminalValuePV)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-muted/30 border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Metodologia</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este laudo utiliza o método de <strong>Fluxo de Caixa Descontado (DCF)</strong>, que projeta os fluxos de caixa futuros da empresa e os traz a valor presente utilizando uma taxa de desconto que reflete o risco do negócio. O valor terminal considera um crescimento perpétuo de {formatPercent(result.perpetualGrowth)} ao ano, que representa uma expectativa conservadora de crescimento de longo prazo alinhada com a economia brasileira.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Aviso Legal:</strong> Este documento é uma estimativa de valor baseada nas informações fornecidas pelo usuário e metodologias padrão de mercado. Não constitui uma oferta, proposta ou garantia de valor de mercado. Para transações de M&A, recomendamos a contratação de auditoria profissional e assessoria especializada.
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
