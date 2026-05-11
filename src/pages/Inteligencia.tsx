import { useUserSector } from "@/hooks/useUserSector";
import { useSectorResearch } from "@/hooks/useSectorResearch";
import { InteligenciaHero } from "@/components/inteligencia/InteligenciaHero";
import { PainelRanking } from "@/components/inteligencia/PainelRanking";
import { PainelEficiencia } from "@/components/inteligencia/PainelEficiencia";
import { PainelVelocidade } from "@/components/inteligencia/PainelVelocidade";
import { PainelHeadToHead } from "@/components/inteligencia/PainelHeadToHead";
import { PainelMnA } from "@/components/inteligencia/PainelMnA";
import { ConclusaoSetorial } from "@/components/inteligencia/ConclusaoSetorial";
import { GeneratingState } from "@/components/inteligencia/shared/GeneratingState";
import { EmptyState } from "@/components/inteligencia/shared/EmptyState";
import { FootnoteSource } from "@/components/inteligencia/shared/FootnoteSource";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function Inteligencia() {
  const { sectorSlug, isLoading: sectorLoading } = useUserSector();
  const { data, isLoading, isMissing, isExpired, generate, isGenerating, generateError } =
    useSectorResearch(sectorSlug);

  // Auto-refresh em background quando expirado
  useEffect(() => {
    if (data && isExpired && !isGenerating) {
      generate(true);
    }
  }, [data, isExpired, isGenerating, generate]);

  const setorNome = data?.setor_nome_completo || sectorSlug.replace(/-/g, " ");

  if (sectorLoading || isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full mt-8" />
      </div>
    );
  }

  if (isMissing || generateError) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <InteligenciaHero setorNome={setorNome} />
        <div className="mt-8">
          {generateError ? (
            <EmptyState
              title="Não conseguimos gerar agora"
              description={String((generateError as any)?.message ?? "Tente novamente em alguns minutos.")}
              cta="Tentar novamente"
              onAction={() => generate(false)}
            />
          ) : (
            <GeneratingState
              setorNome={setorNome}
              isGenerating={isGenerating}
              onGenerate={() => generate(false)}
            />
          )}
        </div>
      </div>
    );
  }

  const p = data!.payload_json;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <InteligenciaHero
        setorNome={p.setor || setorNome}
        periodoReferencia={data!.periodo_referencia}
        dataGeracao={data!.data_geracao}
        isExpired={isExpired}
        onRefresh={() => generate(true)}
        isRefreshing={isGenerating}
      />
      <PainelRanking data={p.painel_1_ranking} />
      <PainelEficiencia data={p.painel_2_eficiencia} />
      <PainelVelocidade data={p.painel_3_velocidade} />
      <PainelHeadToHead data={p.painel_4_head_to_head} />
      <PainelMnA data={p.painel_5_mna} />
      <ConclusaoSetorial data={p.conclusao_setorial} />
      <FootnoteSource fontes={data!.fontes_primarias} />
      {p.limitacoes?.length ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400 break-words">
          Limitações declaradas: {p.limitacoes.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
