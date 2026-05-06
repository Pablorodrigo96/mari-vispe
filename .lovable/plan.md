## Fixes — Mapa Anatel

### 1. Bolinhas vermelhas em cidades com overlap de rede

No `AnatelProviderMap.tsx`, pré-computar (memo) o set de chaves de cidade (`ibge:<codigo>` ou `nm:<cidade>|<uf>`) que aparecem em **2+ camadas** de provedores. Ao desenhar cada `circleMarker`, se a cidade pertence a esse set:
- `fillColor = "#EF4444"` (vermelho)
- `color = "#EF4444"` com `weight: 2`
- mantém o `radius` calculado por acessos
- popup ganha linha extra: `⚠ Sobreposição: cidade atendida por N provedores selecionados`.

Hub continua com borda branca, mas pintado de vermelho quando overlapado.

### 2. "Buscar empresas no raio" não funciona

Causas reais:
- Botão fica `disabled` quando nenhum slot está marcado como 🎯 comprador → usuário clica e nada acontece.
- `handleSearchMarket` retorna em silêncio se `seeds` for vazio — sem feedback.

Correções:
- **Fallback de sementes**: em `MapaPage.tsx`, se `buyerCnpjs.size === 0`, usar **todos os provedores selecionados** como sementes (UI mostra hint "usando todos os slots como semente — marque um como comprador para focar"). Botão deixa de ser `disabled` quando há ≥1 provedor selecionado.
- **Toast de erro/sucesso** no `handleSearchMarket` usando `useToast` para mostrar quantas cidades/provedores voltaram, ou erro caso a edge function falhe.
- **Console log** na chamada e na resposta para diagnóstico futuro.
- `MarketRadiusPanel`: trocar a frase "Marque ao menos 1 slot como 🎯 comprador" por "Sem comprador marcado: usando todos os slots como semente" quando há provedores selecionados sem buyer; manter desabilitado apenas quando `selectedProviders.length === 0`.

### Arquivos editados

- `src/components/equity-brain/AnatelProviderMap.tsx` — adiciona `overlapKeys` memo + pinta marcadores e popup.
- `src/pages/equity-brain/MapaPage.tsx` — `buildSeeds` usa todos slots se nenhum buyer marcado; toast + log.
- `src/components/equity-brain/MarketRadiusPanel.tsx` — `disabled` agora depende de `selectedProviders.length === 0` (nova prop `hasProviders`); muda hint.

### Critério de aceite

- Selecionar 2 provedores com cidades em comum → essas bolinhas viram vermelhas no mapa.
- Sem marcar comprador, clicar em "Buscar empresas no raio" → busca roda usando todos slots, painel mostra resultados; toast confirma "X provedores em Y cidades" ou erro detalhado.
- Marcar 1 slot como comprador → botão usa só esse slot como semente (comportamento atual mantido).
