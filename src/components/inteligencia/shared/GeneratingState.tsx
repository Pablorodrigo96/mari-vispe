import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  setorNome: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function GeneratingState({ setorNome, isGenerating, onGenerate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-accent/30 bg-gradient-to-b from-accent/5 to-transparent p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
        {isGenerating ? (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        ) : (
          <Sparkles className="h-6 w-6 text-accent" />
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">
        {isGenerating ? "Mari está pesquisando seu setor…" : `Análise de ${setorNome}`}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground break-words">
        {isGenerating
          ? "Coletando dados de reguladores, B3, imprensa setorial e M&A. Isso leva 30 a 60 segundos."
          : "Vamos gerar a análise profissional do seu setor em 5 lentes (tamanho, eficiência, velocidade, head-to-head e M&A)."}
      </p>
      {!isGenerating && (
        <Button onClick={onGenerate} size="lg" className="mt-6">
          <Sparkles className="mr-2 h-4 w-4" />
          Gerar análise do meu setor
        </Button>
      )}
    </div>
  );
}
