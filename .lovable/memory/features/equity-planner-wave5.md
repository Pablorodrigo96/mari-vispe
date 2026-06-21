---
name: Equity Planner Wave 5 — Buyer Reverso & Outreach
description: Seleção de comprador-alvo reordena plano, gera carta-convite blind via IA e habilita envio por WhatsApp/cópia.
type: feature
---
- `equity_buyer_map` ganhou `selecionado boolean` (1 alvo por assessment, garantido client-side) e `carta_convite text` (cache da carta gerada).
- Edge function `equity-planner-buyer-letter` (Claude Haiku 4.5, fallback Gemini): gera carta blind ≤220 palavras, mantém empresa anônima, ancora em sinergias+racional do prêmio do buyer + EBITDA/múltiplo do valuation. Persiste em `equity_buyer_map.carta_convite`.
- UI `/equity-planner/:id`:
  - **Aba Compradores**: botões "Definir como alvo" / "Gerar carta" por card; selo `Alvo` no card escolhido.
  - **Aba Plano**: banner "Plano em engenharia reversa para X" + iniciativas que casam com sinergias do alvo são realçadas e re-priorizadas via `useMemo(initsReordered)`.
  - **Dialog Carta**: textarea editável + Regenerar / Copiar / Enviar via WhatsApp (`wa.me/?text=`).
- Mapeamento sinergia→dimensão é heurístico (regex sobre tese+sinergias+racional) cobrindo as 12 dimensões.
