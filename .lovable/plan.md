# Ajuste dos brasões das ligas

## Objetivo
Substituir os ícones/emojis atuais da tela de ligas pelos brasões reais enviados, cruzando cada nome com seu arquivo correto e mantendo a identidade visual já existente.

## O que vou fazer
1. Mapear cada liga da tela `/investir/ligas` para o respectivo brasão real enviado:
   - Liga Academias → `Academias.png`
   - Liga Construção → `Construção.png`
   - Liga Tecnologia → `Tecnologia.png`
   - Liga Alimentação → `Alimentação.png`
   - Liga Indústria → `Indústria.png`
   - Liga Franquias → `Franquias.png`
   - Liga Saúde → `Saúde.png`
   - Liga Agro → `Agro.png`
2. Adicionar os arquivos como assets do app e centralizar o mapeamento em uma estrutura única, em vez de manter emojis hardcoded dentro da página.
3. Refatorar `src/pages/investir/Ligas.tsx` para renderizar imagem do brasão com `alt` correto, proporção estável e fallback visual consistente.
4. Preservar o layout atual dos cards, ajustando apenas o bloco visual do topo para acomodar os brasões sem distorção nem quebra no mobile.
5. Validar se não há outro ponto da experiência de “ligas” usando os mesmos dados hardcoded e, se fizer sentido, deixar a fonte preparada para reuso.

## Resultado esperado
- Cada card da liga exibirá o brasão correto em vez de emoji.
- Os nomes ficarão casados com os arquivos reais enviados.
- A grade continuará responsiva e visualmente consistente.

## Detalhes técnicos
- Arquivo principal identificado: `src/pages/investir/Ligas.tsx`
- Hoje os dados estão inline com a chave `emoji`; isso será trocado por uma chave de imagem/asset.
- Vou seguir o fluxo de assets do projeto para referenciar imagens sem deixar binários soltos no repositório.
- Não vou mexer na lógica de ranking, membros ou CTA; só na representação visual das ligas.

## Fora de escopo
- Redesenhar a página de ligas inteira.
- Alterar nomes das ligas, métricas, ordenação ou navegação.
- Expandir isso para outras telas além do que já estiver diretamente ligado à listagem de ligas.