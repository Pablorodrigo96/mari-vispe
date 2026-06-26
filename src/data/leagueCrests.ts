import ligaAcademiasAsset from "@/assets/ligas/liga-academias.png.asset.json";
import ligaAgroAsset from "@/assets/ligas/liga-agro.png.asset.json";
import ligaAlimentacaoAsset from "@/assets/ligas/liga-alimentacao.png.asset.json";
import ligaConstrucaoAsset from "@/assets/ligas/liga-construcao.png.asset.json";
import ligaFranquiasAsset from "@/assets/ligas/liga-franquias.png.asset.json";
import ligaIndustriaAsset from "@/assets/ligas/liga-industria.png.asset.json";
import ligaSaudeAsset from "@/assets/ligas/liga-saude.png.asset.json";
import ligaTecnologiaAsset from "@/assets/ligas/liga-tecnologia.png.asset.json";

export const LEAGUE_CRESTS = {
  academias: ligaAcademiasAsset.url,
  agro: ligaAgroAsset.url,
  alimentacao: ligaAlimentacaoAsset.url,
  construcao: ligaConstrucaoAsset.url,
  franquias: ligaFranquiasAsset.url,
  industria: ligaIndustriaAsset.url,
  saude: ligaSaudeAsset.url,
  tech: ligaTecnologiaAsset.url,
  tecnologia: ligaTecnologiaAsset.url,
} as const;

export type LeagueCrestId = keyof typeof LEAGUE_CRESTS;
