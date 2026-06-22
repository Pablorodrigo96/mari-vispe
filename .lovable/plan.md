
# Redesign /investir — porta clara para o investidor PF + compra estilo Rico

## Objetivo
Hoje o `/investir` está institucional/denso demais para o usuário final e o "Home Broker" interno (modal de reserva + aba Oferta) está cheio de jargão técnico (supply, token standard, smart contract, blockchain network, instrumento jurídico) que assusta investidor leigo. Vamos:

1. Reorganizar a **home /investir** com caminho lógico de leitura (XP/Rico-like): herói direto → benefícios em cards → ofertas em destaque → como funciona em 4 passos visuais → prova social/segurança → CTA.
2. Simplificar a **página do ativo `/investir/ativo/:symbol`** com linguagem coloquial e um painel de compra à direita estilo boleta Rico (Quanto quero investir → Quantas cotas → Confirmar).
3. Reescrever o **ReservationModal (boleta de compra)** num formato de 2 passos super simples: valor → confirmação, com resumo claro ("Você vai investir R$ X e receber Y cotas de NomeEmpresa"), saldo da carteira no topo, atalho rápido +R$100/+R$500/+R$1.000 e botão único grande "Confirmar reserva".

Identidade visual continua mari (Carbon/Volt/Bone). Sem novas tabelas, sem migrations, sem mudança de backend — só frontend e copy.

## Mudanças por tela

### 1. `/investir` — Home
Caminho de leitura novo:

```text
[HERO]
 "Invista em empresas reais a partir de R$ 100."
 subtítulo curto + 2 CTAs (Quero começar / Ver empresas)
 prova: "+X empresas · ticket a partir de R$100 · 100% digital"

[POR QUE INVESTIR AQUI] - 4 cards grandes, ícone+título+1 frase
 · Ticket baixo  · Empresas curadas  · 100% digital  · Você no controle

[OFERTAS EM DESTAQUE] - até 6 cards (já existe, manter)

[COMO FUNCIONA] - 4 passos com número grande
 1 Crie sua conta (2 min)
 2 Confirme seus dados
 3 Deposite via Pix
 4 Escolha e invista

[SEGURANÇA & TRANSPARÊNCIA] - 3 selos: KYC, custódia, documentação

[FAQ rápido] - 4 perguntas dobráveis (linguagem leiga)

[CTA final]
```

Trocar copy: nada de "private equity digital", "ativos tokenizados", "primary_open" — usar "empresas", "cotas", "oferta aberta".

### 2. `/investir/ativo/:symbol` — Página do ativo
- Hero mais simples: nome grande, 1 linha sobre o negócio, badge "Oferta aberta", 3 números grandes (Preço por cota · Mínimo · Quanto já foi captado).
- Abas reduzidas de 5 → 3: **Sobre a empresa · A oferta · Documentos** (Riscos vira accordion no rodapé do "A oferta"; aba "Empresa" funde com "Sobre a empresa").
- Aba "A oferta" **sem jargão de blockchain por padrão** (esconde Supply/Smart contract/Rede atrás de toggle "Detalhes técnicos"). Mostrar: o que você recebe, como recebe retorno, prazo, liquidez esperada — em frases curtas.
- Painel lateral vira **boleta estilo Rico**:

```text
┌──────────────────────────┐
│ Saldo disponível         │
│ R$ 2.350,00               │
├──────────────────────────┤
│ Quanto quero investir    │
│ [ R$ 500,00          ]   │
│ [+100] [+500] [+1.000]   │
│                          │
│ Você recebe: 5 cotas     │
│ Preço por cota: R$ 100   │
│                          │
│ [ Investir agora ]       │
│ ⓘ Reserva sujeita a KYC  │
└──────────────────────────┘
```

### 3. ReservationModal — boleta 2 passos
Substituir layout atual por:

- **Passo 1 — Valor**:
  - Topo: "Você está investindo em **NomeEmpresa**"
  - Card saldo disponível
  - Input grande de valor com máscara BRL
  - Chips rápidos: +R$100, +R$500, +R$1.000, "tudo"
  - Resumo dinâmico: "Você recebe **X cotas** a R$ Y cada"
  - Validações inline (abaixo do mínimo / saldo insuficiente) com link "Adicionar saldo" → `/investir/carteira`
  - Botão "Continuar"

- **Passo 2 — Confirmação**:
  - Resumo grande em 3 linhas: Empresa · Valor · Cotas
  - Aviso curto LGPD/risco em 1 linha
  - Checkbox "Li e concordo com os documentos da oferta" (link Docs)
  - Botão único "Confirmar reserva" (mesma lógica de backend que já existe)
  - Estados de erro (KYC pendente, suitability faltando, não-autenticado) viram telas dedicadas dentro do modal com 1 CTA cada — não inline texts.

Backend / RPC / tabelas: **nada muda**. Mesma chamada `compliance_checks` + update de wallet + insert ledger + insert reservation já existente.

## Arquivos afetados
- `src/pages/investir/InvestirHome.tsx` — reescrita de seções e copy.
- `src/pages/investir/InvestirAtivo.tsx` — abas reduzidas, copy simplificada, toggle técnico, painel lateral mais limpo.
- `src/components/investir/ReservationModal.tsx` — refator para 2 passos com boleta tipo Rico.
- (Opcional, se sobrar) `src/components/investir/InvestirShell.tsx` — pequena revisão do header (menu mais simples).

## Fora de escopo
- Não cria tabelas novas, não mexe em RLS, não mexe em edge functions.
- Não muda fluxo de Pix/Stripe da carteira.
- Não toca `/painel`, `/equity-brain` nem áreas internas (advisor/admin).
- Sem mudanças em `/investir/empresas` (listagem) e `/investir/carteira` nesta rodada — se você quiser que eu também simplifique essas duas, me avise e eu incluo.
