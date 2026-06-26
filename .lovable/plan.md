## Como vamos executar

Quatro ondas, uma de cada vez. Cada onda termina com auditoria rápida (smoke test + screenshots) antes de abrir a próxima. Modelo de IA usado nas funções de geração/parecer: `google/gemini-3-flash-preview` (padrão Lovable AI Gateway). Esta mensagem cobre o plano completo das 4 ondas; ao aprovar, implemento **somente a Onda 1** e volto para o seu sinal antes da próxima.

Decisões já confirmadas:
- O1.4: preço correto = **R$ 297/mês**, alinhar o card/landing ao Stripe.
- O3.1/O3.2: WhatsApp Rafael = **55 51 99233-8258** (usar `getWhatsAppLink`).
- O4.4: Inteligência de Mercado vira **multi-setor**.
- O4.5: Chat = **botão flutuante WhatsApp** (sem widget de terceiro).

---

## 🌊 Onda 1 — Estancar

Objetivo: parar sangramento (jurídico, financeiro, bugs que travam uso).

- **O1.1 TLS 10/jul** — Lovable/Cloudflare renova SSL automaticamente em domínios conectados pelo painel. Vou abrir Project Settings → Domains, confirmar status `Active` em `mari.vispe.com.br` e nos demais, e documentar. Se algum estiver `Offline/Failed`, instruo o reconnect (não é editável via código).
- **O1.2 Privacidade/LGPD** — já existe `src/pages/investir/politicas/InvestirPrivacidade.tsx` só dentro de `/investir`. Vou criar a rota pública `/privacidade` reutilizando o conteúdo e linkar no rodapé global.
- **O1.3 Termos v2.0** — atualizar `src/pages/Terms.tsx` e a página de privacidade com o texto v2.0 (Jun/2026). **Preciso do texto** do Anexo B citado — sem o conteúdo eu não posso "inventar" cláusulas jurídicas. Vou subir um placeholder visível ("conteúdo pendente de inserção") até você colar.
- **O1.4 Checkout Master** — alinhar card/landing para **R$ 297/mês** e trocar nome do emissor de "Vispe Skills" para "Vispe Capital" no produto Stripe (via tool Stripe) + textos do checkout/UI.
- **O1.5 Compradores fake** — auditar dashboard do empreendedor; substituir o placeholder "8 compradores" por contagem real de `equity_brain.matches`/`buyer_profiles` filtrada por mandato do usuário; vazio = `0` + CTA.
- **O1.6 Diário não salva** — depurar insert do Diário (Operação → aba Diário): inspecionar componente, validar RLS e GRANTs da tabela usada, logar erro real no toast.
- **O1.7 Registrar call** — corrigir insert e mudar fonte: só listar operações em estágio ≥ match (filtrar `eb_pipeline_stages.key`).
- **O1.8 Aprovação some** — fila admin não puxa novas listings. Conferir filtro de status em `AdminApprovals.tsx` e a query (provável `status = 'pending'` faltando ou RLS de admin).

Auditoria O1: criar conta nova, cadastrar oportunidade, aprovar no admin, abrir Master no checkout, salvar diário e call, screenshots.

---

## 🌊 Onda 2 — Dados confiáveis

- **O2.1 CNPJ "LST+id"** — em listas de Oportunidades/Carteira, trocar coluna que mostra `listings.id` (ou codename) pelo `listings.cnpj`. Quando vazio, mostrar "—" + tooltip "CNPJ não informado".
- **O2.2 Tabela mestre de mandatos** — mesma correção de CNPJ + separar `eb_mandates` de listings de marketplace (hoje a view une fontes). Adicionar coluna `source` e filtro padrão "mandatos".
- **O2.3 Coleta de mandatos** — mapear página/fluxo "Coleta de mandatos", reproduzir erro, corrigir submissão (provavelmente edge function ou RLS).
- **O2.4 Dashboards via Monday** — criar edge function `monday-sync` que puxa via conector Monday (gateway) e materializa em `eb_monday_*` tables; dashboards passam a ler delas. Cron 30min. Removemos a base migrada como fonte primária.
- **O2.5 "Nenhum comprador com contato"** — no detalhe da operação, JOIN `deal_pairs` → `buyer_profiles` → `prospect_contacts`. Hoje provavelmente filtra por `buyer_id` direto sem o pair.
- **O2.6 Documentos somem no Admin** — criar/expor aba "Documentos" na operação no Admin lendo `listing_financial_docs` + `deal_documents` por `listing_id`.
- **O2.7 Upload múltiplo** — trocar `<input type=file>` por multi (`multiple` + loop de upload paralelo) em Documentos obrigatórios; barra de progresso por arquivo.

Auditoria O2: comparar 3 dashboards com Monday, abrir uma operação real, validar CNPJ + contatos + docs.

---

## 🌊 Onda 3 — Navegação e UX

- **O3.1 / O3.2** — substituir `onClick` desses botões por `window.open(getWhatsAppLink('5551992338258', mensagem))`. Mensagem contextualizada ("Olá Rafael, sou {nome}, quero falar sobre {empresa}").
- **O3.3 Funil público** — na página de busca por CNPJ pública, remover botão "Ver compradores compatíveis" e deixar só "Anunciar minha empresa" → `/auth?next=/vender`.
- **O3.4 "Ver planos"** — redirecionar para `/planos` (ou seção de planos da home) em vez de `/`.
- **O3.5 "Refinar com Consultoria Vispe Capital"** — no Plano Perfeito, abrir WhatsApp Rafael com contexto do plano (valuation, gap, meta) em vez de `/`.
- **O3.6 Plano Perfeito salvar** — após `INSERT` em `planos_perfeitos`, `navigate('/meus-planos-perfeitos')` + toast.
- **O3.7 Inteligência piscando** — em `src/pages/Inteligencia.tsx`, remover/condicionar o `useEffect` que chama `generate(true)` em background (já está com guard `refreshedRef`, mas o trigger atual roda toda vez que `isExpired` flipa). Trocar para refresh apenas via botão.
- **O3.8 Pipeline $$** — adicionar soma de `deal_pairs.deal_value` por coluna no Kanban; no Admin, totalizador com take-rate Vispe.
- **O3.9 Botão encerrar** — adicionar ação "Encerrada / Perdida" no card do Kanban com motivo (won/lost) gravado em `eb_pipeline_transitions`.
- **O3.10 "A MARI" → "O Mari"** — `rg -l "A MARI|a MARI|A Mari"` e substituir, preservando casing.

Auditoria O3: clicar em cada botão listado e validar destino.

---

## 🌊 Onda 4 — Features novas

- **O4.1 Notícias 06h** — edge function `news-fetch` lê portais públicos da lista do Anexo A (RSS quando disponível; scrape leve quando não), grava em `news_items`. Cron diário 06h BRT. Portais pagos (Bloomberg/FT/WSJ/PitchBook/Mergermarket) ficam com flag `requires_subscription=true` e só aparecem se o usuário tiver chave configurada — por padrão, ocultos.
- **O4.2 Biblioteca de documentos**
  - (a) Liberar CRUD de templates para role `advisor` (Rafael já é advisor); UI admin em `/biblioteca-documentos`.
  - (b) Botão "Criar minuta" → chat com `google/gemini-3-flash-preview` via Lovable AI Gateway, system prompt monta contexto com os templates aprovados; saída em Markdown + download .docx.
- **O4.3 Parecer IA no Simulador** — após resultado, edge function `investor-sim-opinion` recebe respostas, monta prompt com abordagem Vispe (texto base que você define) e retorna parecer por tópico. Renderiza acordeão na tela final.
- **O4.4 Inteligência multi-setor** — generalizar `useSectorResearch`/`research-sector` para qualquer setor do `vertical_registry`. Cron diário 04h refresca top-N setores ativos; on-demand para os demais. UI ganha seletor de setor.
- **O4.5 Chat = WhatsApp flutuante** — componente `WhatsAppFab` (bolha no canto inferior direito, todas as páginas exceto `/auth`) abrindo `getWhatsAppLink('5551992338258')` com mensagem "Olá, vim pelo site mari.vispe.com.br".

Auditoria O4: validar cron de notícias rodando, gerar uma minuta, gerar um parecer IA, abrir Inteligência em 2 setores diferentes, clicar no FAB WhatsApp.

---

## Pendências que travam itens

1. **Texto v2.0 dos Termos/Privacidade (O1.3)** — colar o Anexo B.
2. **Texto-base da "abordagem Vispe" (O4.3)** — para o parecer ficar com a voz certa.
3. **Take-rate Vispe (O3.8)** — % ou fórmula para o totalizador admin.

Posso começar a Onda 1 já assumindo placeholders para esses três e você substitui depois — me confirma se prefere assim ou se prefere esperar os textos.
