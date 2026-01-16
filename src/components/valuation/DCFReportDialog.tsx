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
import { Download, ArrowLeft, TrendingUp, Building2, Calculator, BarChart3, Target, PieChart, MessageCircle } from 'lucide-react';
import { DCFResult } from '@/lib/dcfCalculator';
import { EnterpriseValueDiagram } from './EnterpriseValueDiagram';
import { formatFullCurrency } from '@/lib/formatters';
import jsPDF from 'jspdf';

interface DCFReportDialogProps {
  open: boolean;
  onClose: () => void;
  onBackToStart: () => void;
  result: DCFResult;
}

export const DCFReportDialog = ({
  open,
  onClose,
  onBackToStart,
  result,
}: DCFReportDialogProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
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
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    addText('DEALFLOW', margin, 20, { fontSize: 24, fontStyle: 'bold', color: [212, 175, 55] });
    addText('Valuation DCF - Fluxo de Caixa Descontado', margin, 32, { fontSize: 14, color: [255, 255, 255] });
    addText(`Emitido em ${formatDate(result.calculatedAt)}`, margin, 42, { fontSize: 10, color: [200, 200, 200] });

    yPos = 70;

    // Main Valuation
    doc.setFillColor(212, 175, 55);
    doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 45, 3, 3, 'F');
    addText('ENTERPRISE VALUE (Valor da Empresa)', margin + 5, yPos + 5, { fontSize: 12, fontStyle: 'bold', color: [15, 23, 42] });
    addText(formatFullCurrency(result.enterpriseValue), margin + 5, yPos + 22, { fontSize: 26, fontStyle: 'bold', color: [15, 23, 42] });
    addText(`Range: ${formatFullCurrency(result.valueLow)} - ${formatFullCurrency(result.valueHigh)} (±6%)`, margin + 5, yPos + 35, { fontSize: 9, color: [30, 41, 59] });

    yPos += 60;

    // Premises
    addText('PREMISSAS DO MODELO', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + 50, yPos);
    yPos += 10;

    const premisesInfo = [
      ['Tipo de Empresa:', result.premises.companyTypeLabel],
      ['Taxa de Crescimento:', formatPercent(result.premises.growthRate)],
      ['WACC:', formatPercent(result.premises.wacc)],
      ['Prêmio de Risco:', formatPercent(result.premises.riskPremium)],
      ['Crescimento Terminal:', formatPercent(result.premises.terminalGrowth)],
    ];

    premisesInfo.forEach(([label, value]) => {
      addText(label, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      addText(value, margin + 45, yPos, { fontSize: 10 });
      yPos += 6;
    });

    yPos += 10;

    // Projections Table
    addText('PROJEÇÕES (3 ANOS)', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 8;
    doc.line(margin, yPos, margin + 45, yPos);
    yPos += 10;

    // Table header
    const colWidths = [25, 35, 30, 35, 35];
    const headers = ['Ano', 'Receita', 'EBITDA', 'FCFF', 'VP'];
    let xPos = margin;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

    headers.forEach((header, i) => {
      addText(header, xPos + 2, yPos, { fontSize: 9, fontStyle: 'bold', color: [255, 255, 255] });
      xPos += colWidths[i];
    });

    yPos += 8;

    // Table rows
    result.projections.forEach((proj) => {
      xPos = margin;
      const row = [
        `Ano ${proj.year}`,
        formatFullCurrency(proj.revenue),
        formatFullCurrency(proj.ebitda),
        formatFullCurrency(proj.fcff),
        formatFullCurrency(proj.presentValue),
      ];
      row.forEach((cell, i) => {
        addText(cell, xPos + 2, yPos, { fontSize: 9 });
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    yPos += 10;

    // Terminal Value
    addText('VALOR TERMINAL', margin, yPos, { fontSize: 12, fontStyle: 'bold' });
    yPos += 10;

    addText('Valor Terminal (Perpetuidade):', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText(formatFullCurrency(result.terminalValue), margin + 60, yPos, { fontSize: 10 });
    yPos += 6;
    addText('VP do Valor Terminal:', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText(formatFullCurrency(result.terminalValuePV), margin + 60, yPos, { fontSize: 10 });

    // Footer
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    addText('© DealFlow - Marketplace M&A', margin, pageHeight - 6, { fontSize: 8, color: [200, 200, 200] });
    addText('www.dealflow.com.br', pageWidth - margin - 35, pageHeight - 6, { fontSize: 8, color: [212, 175, 55] });

    // Save
    doc.save(`valuation-dcf-${result.inputs.companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-[#0F172A] text-white -m-6 mb-0 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30 mb-2">
                Valuation DCF - Fluxo de Caixa Descontado
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
          <div className="bg-gradient-to-r from-accent to-accent/80 rounded-xl p-6 text-center">
            <p className="text-accent-foreground/80 text-sm mb-2">Enterprise Value (Valor da Empresa)</p>
            <p className="text-4xl font-bold text-accent-foreground">
              {formatFullCurrency(result.enterpriseValue)}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <span className="text-accent-foreground/80">
                Min: {formatFullCurrency(result.valueLow)}
              </span>
              <Target className="w-4 h-4 text-accent-foreground" />
              <span className="text-accent-foreground/80">
                Máx: {formatFullCurrency(result.valueHigh)}
              </span>
            </div>
            <p className="text-accent-foreground/60 text-xs mt-2">
              Análise de sensibilidade: ±6%
            </p>
          </div>

          {/* Grid with Company and Premises */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-accent" />
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
                  <span className="font-medium">{result.premises.companyTypeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segmento</span>
                  <span className="font-medium">{result.inputs.segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável</span>
                  <span className="font-medium">{result.inputs.fullName}</span>
                </div>
              </div>
            </div>

            {/* Premises */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">Premissas do Modelo</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Crescimento</span>
                  <span className="font-medium">{formatPercent(result.premises.growthRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WACC</span>
                  <span className="font-medium">{formatPercent(result.premises.wacc)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prêmio de Risco</span>
                  <span className="font-medium">{formatPercent(result.premises.riskPremium)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crescimento Terminal</span>
                  <span className="font-medium">{formatPercent(result.premises.terminalGrowth)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Projections Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Projeções (3 Anos)</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#0F172A]">
                    <TableHead className="text-white">Ano</TableHead>
                    <TableHead className="text-white text-right">Receita</TableHead>
                    <TableHead className="text-white text-right">Margem EBITDA</TableHead>
                    <TableHead className="text-white text-right">EBITDA</TableHead>
                    <TableHead className="text-white text-right">FCFF</TableHead>
                    <TableHead className="text-white text-right">VP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.projections.map((proj) => (
                    <TableRow key={proj.year}>
                      <TableCell className="font-medium">Ano {proj.year}</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.revenue)}</TableCell>
                      <TableCell className="text-right">{proj.ebitdaMargin.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.ebitda)}</TableCell>
                      <TableCell className="text-right">{formatFullCurrency(proj.fcff)}</TableCell>
                      <TableCell className="text-right font-medium">{formatFullCurrency(proj.presentValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-accent/10">
                    <TableCell colSpan={5} className="font-bold text-accent">Soma VP Projetado</TableCell>
                    <TableCell className="text-right font-bold text-accent">{formatFullCurrency(result.sumProjectedPV)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Terminal Value */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold">Valor Terminal (Perpetuidade)</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-white/60 text-xs">Valor Terminal</p>
                <p className="font-semibold text-lg text-accent">{formatFullCurrency(result.terminalValue)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">VP do Valor Terminal</p>
                <p className="font-semibold text-lg text-accent">{formatFullCurrency(result.terminalValuePV)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Enterprise Value</p>
                <p className="font-semibold text-lg text-accent">{formatFullCurrency(result.enterpriseValue)}</p>
              </div>
            </div>
          </div>

          {/* Enterprise Value Breakdown Diagram */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Composição do Enterprise Value</h3>
            </div>
            <EnterpriseValueDiagram 
              projections={result.projections}
              terminalValuePV={result.terminalValuePV}
              sumProjectedPV={result.sumProjectedPV}
              enterpriseValue={result.enterpriseValue}
            />
          </div>

          {/* Methodology */}
          <div className="bg-muted/30 rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-2">Metodologia</h3>
            <p className="text-sm text-muted-foreground">
              Este laudo utiliza o método de Fluxo de Caixa Descontado (DCF), projetando os fluxos de caixa
              livres (FCFF) para 3 anos e calculando o valor terminal com perpetuidade. O WACC utilizado
              considera a taxa Selic de 15% + prêmio de risco específico para {result.premises.companyTypeLabel.toLowerCase()}.
              A fórmula: Enterprise Value = Σ(VP dos FCFFs) + VP do Valor Terminal.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Aviso Legal:</strong> Este documento é uma estimativa de valor baseada nas 
              informações fornecidas e premissas padrão de mercado. Não constitui oferta ou garantia de valor. 
              Recomendamos due diligence profissional para transações.
            </p>
          </div>

          {/* CTA WhatsApp */}
          <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/30 rounded-xl p-5 text-center">
            <h3 className="font-semibold text-foreground mb-2">
              Quer um Valuation mais preciso?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fale com nossos especialistas para um projeto consultivo exclusivo com análise aprofundada do seu negócio.
            </p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <a 
                href="https://wa.me/5551992338258?text=Olá! Gostaria de saber mais sobre um Valuation consultivo para minha empresa."
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar com Especialista
              </a>
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
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
