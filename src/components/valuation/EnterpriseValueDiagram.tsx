import { YearProjection } from '@/lib/dcfCalculator';
import { formatFullCurrency } from '@/lib/formatters';
import { Plus, ArrowUp } from 'lucide-react';

interface EnterpriseValueDiagramProps {
  projections: YearProjection[];
  terminalValuePV: number;
  sumProjectedPV: number;
  enterpriseValue: number;
}

export const EnterpriseValueDiagram = ({
  projections,
  terminalValuePV,
  sumProjectedPV,
  enterpriseValue,
}: EnterpriseValueDiagramProps) => {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Enterprise Value - Top Box */}
      <div className="w-full max-w-md bg-gradient-to-r from-accent to-accent/80 rounded-xl p-4 text-center shadow-lg">
        <p className="text-accent-foreground/80 text-xs font-medium mb-1">ENTERPRISE VALUE</p>
        <p className="text-2xl sm:text-3xl font-bold text-accent-foreground">
          {formatFullCurrency(enterpriseValue)}
        </p>
      </div>

      {/* Arrow pointing up with equals sign */}
      <div className="flex items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <ArrowUp className="w-4 h-4 text-accent" />
        </div>
        <span className="text-lg font-bold text-accent">=</span>
      </div>

      {/* Sum Container */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        {/* Sum of Projected PVs */}
        <div className="flex-1 max-w-[200px] bg-[#0F172A] rounded-xl p-4 text-center">
          <p className="text-white/60 text-xs mb-1">Σ VP dos FCFFs</p>
          <p className="text-lg font-bold text-accent">
            {formatFullCurrency(sumProjectedPV)}
          </p>
        </div>

        {/* Plus sign */}
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-accent" />
        </div>

        {/* Terminal Value PV */}
        <div className="flex-1 max-w-[200px] bg-[#0F172A] rounded-xl p-4 text-center">
          <p className="text-white/60 text-xs mb-1">VP Valor Terminal</p>
          <p className="text-lg font-bold text-accent">
            {formatFullCurrency(terminalValuePV)}
          </p>
        </div>
      </div>

      {/* Arrow pointing up */}
      <div className="flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <ArrowUp className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Individual Year PVs */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-md">
        {projections.map((proj) => (
          <div
            key={proj.year}
            className="bg-muted/50 border border-border rounded-lg p-3 text-center"
          >
            <p className="text-muted-foreground text-xs mb-1">VP FCFF Ano {proj.year}</p>
            <p className="text-sm font-semibold text-foreground">
              {formatFullCurrency(proj.presentValue)}
            </p>
          </div>
        ))}
      </div>

      {/* Formula text */}
      <div className="text-center mt-2">
        <p className="text-xs text-muted-foreground">
          EV = VP(FCFF₁) + VP(FCFF₂) + VP(FCFF₃) + VP(Valor Terminal)
        </p>
      </div>
    </div>
  );
};
