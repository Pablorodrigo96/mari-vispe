## Fluxo guiado "Passo 1" — Painel → Formulário de Valuation

Hoje o CTA hero do `ExecutiveReport` leva direto para `/valuation/multiplos` (formulário cru). Vou adicionar um **modal de onboarding de 3 telas** que prepara o usuário para o que vem, reduz fricção e empurra para o formulário.

### 1. Novo componente: `ValuationOnboardingDialog`

**Arquivo novo:** `src/components/painel/exec/ValuationOnboardingDialog.tsx`

Modal full-screen-like (max-w-2xl) com 3 etapas, cada uma mostrando exatamente o que o usuário vai preencher:

- **Etapa 1 · ~20s — Conte sobre a empresa** (icon `Building2`): segmento + tipo da empresa.
- **Etapa 2 · ~25s — Números essenciais** (icon `DollarSign`): receita, margem EBITDA, margem líquida — "pode ser estimativa, refina depois".
- **Etapa 3 · ~15s — Para enviar seu relatório** (icon `User`): nome, empresa, email.

Cada tela tem:
- Eyebrow Volt com etapa + tempo estimado.
- Título grande + descrição.
- 2-3 bullets com ícone Check Volt do que será pedido.
- Barra de progresso superior (3 segmentos).
- Botões "Voltar" / "Próximo" e "Pular guia" como link discreto.
- Na última etapa: trust strip (60s · Dados seguros · Grátis) e CTA principal **"Começar agora"** que fecha o modal e navega para `/valuation/multiplos`.

Visual: gradient sutil Volt/card, borda `border-accent/30`, ícones em chips Volt — mantém estética mari.

### 2. Integração com `ExecutiveReport`

**Arquivo:** `src/components/painel/exec/ExecutiveReport.tsx`

No bloco do snapshot vazio (lines 22-83 atuais):
- Adicionar `useState` para `showOnboarding`.
- Trocar o `<Button asChild><Link to="/valuation/multiplos">…</Link></Button>` por `<Button onClick={() => setShowOnboarding(true)}>…</Button>`.
- Renderizar `<ValuationOnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />` no fim.

### Resumo
- Cria `src/components/painel/exec/ValuationOnboardingDialog.tsx` (novo).
- Edita `src/components/painel/exec/ExecutiveReport.tsx` (botão abre modal em vez de navegar direto; modal navega para `/valuation/multiplos` ao final ou ao pular).

Sem mudanças no formulário existente, sem mudanças de roteamento ou banco.
