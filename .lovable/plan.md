Vou ajustar o bloqueio que você ainda está vendo no mobile.

Plano:
1. Corrigir os links da página Jarvis 3D para apontarem para a rota real atual (`/equity-brain/admin/jarvis`) em vez da rota antiga (`/equity-brain/grafo-jarvis`), evitando cair no grafo 2D mobile que ainda mostra “acesse de um computador”.
2. Atualizar também a página guia do Jarvis para voltar/gerar links para a rota real do Jarvis 3D.
3. Se necessário, remover ou trocar o fallback mobile do grafo 2D (`StrategicGraph`) para uma mensagem com CTA ao Jarvis 3D mobile, para não manter a experiência bloqueada.
4. Validar por busca no código que não sobrou nenhum texto “Acesse de um computador” no fluxo do Jarvis 3D.

Arquivos previstos:
- `src/pages/equity-brain/GrafoJarvisPage.tsx`
- `src/pages/equity-brain/GrafoJarvisGuiaPage.tsx`
- possivelmente `src/components/equity-brain/graph/StrategicGraph.tsx`