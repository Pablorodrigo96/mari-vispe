## Mudanças solicitadas

### 1. Renomear "Vendedor" → "Empreendedor" no cadastro

**Arquivo:** `src/pages/Auth.tsx` (linha 38)

Trocar a opção do role `seller`:
- **Label:** `Vendedor` → `Empreendedor`
- **Descrição:** `Quero cadastrar minha empresa` → `Quero avaliar, captar investimento ou vender minha empresa`

O ID do role continua `seller` internamente (não muda nada no banco/RLS/permissões). Só muda o texto exibido.

### 2. Painel como tela inicial após login

**Arquivo:** `src/pages/Auth.tsx` (função `resolveRoleHome`, linhas 41-53)

Hoje cada role tem uma home diferente:
- seller → `/meus-anuncios`
- buyer → `/comprar`
- advisor/admin → `/equity-brain/hoje`
- franchisee → `/painel`

**Novo comportamento:** todos os usuários comuns (seller, buyer, franchisee) vão para `/painel` após login. Apenas `admin` e `advisor` continuam indo para `/equity-brain/hoje` (cockpit interno operacional).

Isto também alinha o signup (que usa `ROLE_HOME[firstAutoRole]`) — atualizar o objeto `ROLE_HOME` para `seller: '/painel'` e `buyer: '/painel'`.

### 3. CTA "Comece pelo seu valuation" mais chamativo

**Arquivo:** `src/components/painel/exec/ExecutiveReport.tsx` (linhas 22-41 — bloco do snapshot vazio)

Reformatar o card para virar **hero destacado** quando o usuário ainda não tem valuation:

- **Layout maior:** card full-width com altura ~280-340px, padding generoso (`p-8 md:p-12`).
- **Background premium:** gradient Volt → Carbon (`from-accent/15 via-accent/5 to-transparent`) com brilho radial sutil, borda Volt mais visível (`border-accent/40`), `shadow-2xl`.
- **Watermark/ornamento:** ícone `Calculator` grande (h-32) posicionado absoluto à direita com baixa opacidade como elemento decorativo, mantendo a estética mari.
- **Eyebrow:** chip "Passo 1 de 3" ou "Comece aqui" em Volt/uppercase tracking-wider.
- **Título maior:** `text-3xl md:text-5xl font-bold tracking-tight` — "Quanto vale sua empresa hoje?"
- **Subtítulo de impacto:** texto atual reformatado em `text-base md:text-lg` com a parte "60 segundos" destacada em Volt.
- **3 mini-bullets** com ícones (Sparkles, ShieldCheck, Target): "Grátis · 60 segundos", "Baseado em dados reais BR", "Mostra seu potencial em 5 anos".
- **CTA principal grande:** `size="lg"` com `text-base px-8 py-6`, ícone Calculator + "Calcular meu valuation agora" + ArrowRight, hover com glow Volt.
- **Microcopy abaixo:** "Sem cartão · Sem cadastro extra" em texto pequeno.
- Animação leve de entrada (fade + translate) e shine sutil no botão.

Mantém paleta mari (Volt #D9F564 / Carbon / Bone) e o `MariBrandStamp`/watermark já presente no Painel para coesão visual.

### Resumo dos arquivos alterados
- `src/pages/Auth.tsx` — renomear label e ajustar `ROLE_HOME` + `resolveRoleHome`
- `src/components/painel/exec/ExecutiveReport.tsx` — reformatar bloco hero do snapshot vazio
