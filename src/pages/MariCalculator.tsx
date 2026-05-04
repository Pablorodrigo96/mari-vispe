import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { CnpjInput } from "@/components/mari-calc/CnpjInput";
import { MariResult, MariResultData } from "@/components/mari-calc/MariResult";
import { computeWindow } from "@/lib/mariWindowHeuristic";

interface BrasilApiCnpj {
  razao_social?: string;
  nome_fantasia?: string;
  uf?: string;
  cnae_fiscal_descricao?: string;
  porte?: string;
}

async function fetchCnpj(cnpj: string): Promise<BrasilApiCnpj | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) return null;
    return (await res.json()) as BrasilApiCnpj;
  } catch {
    return null;
  }
}

export default function MariCalculator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MariResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (cnpj: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Parallel: artificial 1.5s "motor running" + real fetch
    const [_, info] = await Promise.all([
      new Promise((r) => setTimeout(r, 1200)),
      fetchCnpj(cnpj),
    ]);

    if (!info) {
      setError("Não conseguimos consultar esse CNPJ agora. Confirme o número ou tente novamente em instantes.");
      setLoading(false);
      return;
    }

    const window = computeWindow({
      uf: info.uf,
      cnaeSection: info.cnae_fiscal_descricao,
      porte: info.porte,
    });

    setResult({
      cnpj,
      razaoSocial: info.razao_social ?? info.nome_fantasia ?? null,
      uf: info.uf ?? null,
      cnae: info.cnae_fiscal_descricao ?? null,
      porte: info.porte ?? null,
      window,
    });
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Calculadora Mari · Quanto tempo até sua empresa ser vendida?";
  }, []);

  return (
    <>

      <main className="min-h-[100dvh] bg-background">
        <section className="px-4 py-12 md:py-20">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">Calculadora pública</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 break-words leading-tight">
              Quanto tempo até sua empresa ser vendida?
            </h1>
            <p className="text-base md:text-lg text-muted-foreground break-words">
              Digite o CNPJ. A Mari estima a <strong className="text-foreground">janela de venda em 12 meses</strong>,
              com faixa otimista/pessimista e as razões por trás do número.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <CnpjInput onSubmit={handleSubmit} loading={loading} />

            {error && (
              <p className="text-sm text-red-500 mt-3 text-center break-words">{error}</p>
            )}

            {loading && !result && (
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Rodando o motor da Mari nos dados públicos do CNPJ…
                </p>
              </div>
            )}

            {result && (
              <div className="mt-8">
                <MariResult data={result} />
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
