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

  // Refresh em background quando expirado
  useEffect(() => {
    if (data && isExpired && !isGenerating) {
      generate(true);
    }
  }, [data, isExpired, isGenerating, generate]);

  const setorNome = data?.setor_nome_completo || sectorSlug.replace(/-/g, " ");

  return (
    <div className="relative min-h-[100dvh] bg-background">
      {/* Grid sutil de fundo */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        {sectorLoading || isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-10 h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isMissing || generateError ? (
          <>
            <InteligenciaHero setorNome={setorNome} />
            <div className="mt-8">
              {generateError ? (
                <EmptyState
                  title="Não conseguimos gerar agora"
                  description={String(
                    (generateError as any)?.message ?? "Tente novamente em alguns minutos.",
                  )}
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
          </>
        ) : (
          <>
            <InteligenciaHero
              setorNome={data!.payload_json?.setor || setorNome}
              periodoReferencia={data!.periodo_referencia}
              dataGeracao={data!.data_geracao}
              isExpired={isExpired}
              onRefresh={() => generate(true)}
              isRefreshing={isGenerating}
            />
            <PainelRanking data={data!.payload_json?.painel_1_ranking} />
            <PainelEficiencia data={data!.payload_json?.painel_2_eficiencia} />
            <PainelVelocidade data={data!.payload_json?.painel_3_velocidade} />
            <PainelHeadToHead data={data!.payload_json?.painel_4_head_to_head} />
            <PainelMnA data={data!.payload_json?.painel_5_mna} />
            <ConclusaoSetorial data={data!.payload_json?.conclusao_setorial} />
            <FootnoteSource fontes={data!.fontes_primarias} />
            {data!.payload_json?.limitacoes?.length ? (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400 break-words">
                Limitações declaradas: {data!.payload_json.limitacoes.join(" · ")}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
