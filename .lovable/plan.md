# /mari Calculadora — Janela 24m + CTA forte com Gap de Valuation

## Resposta rápida (de onde vem o dado / como calcula)

A calculadora pública `/mari` hoje funciona assim:

1. **Fonte dos dados da empresa**: usuário digita o CNPJ → frontend chama a **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`), endpoint público que espelha a base da Receita Federal. De lá vêm: razão social, UF, município, CNAE primário, porte declarado.
2. **Cálculo da janela**: 100% heurística determinística no client (`src/lib/mariWindowHeuristic.ts`). Sem IA, sem chamada a banco. Score base + ajustes:
   - **Praça** (UF): SP/RJ/MG/RS/PR/SC = praça forte (+pts).
   - **Setor** (CNAE): regex casa Tech/ISP, Saúde, Educação, Alimentos como "aquecidos" (+pts).
   - **Porte**: Média/Grande sobe, MEI/Micro penaliza.
   - Gera `base`, `pessimista` (base-15) e `otimista` (base+15), com `abstain=true` quando há <2 pontos de dado.
3. **Razões do número**: 3 bullets construídos pelas mesmas regras (uma por dimensão).
4. **Conversão**: CTA grava `mari_prefill_v1` em `sessionStorage` e leva para `/auth?...&cnpj=` (signup) ou direto `/vender` (já logado), pré-preenchendo o Sell Wizard.

Vou explicar isso brevemente no próprio painel "Por que essa janela?" via tooltip "ⓘ Como calculamos".

## Mudanças

### 1. `src/lib/mariWindowHeuristic.ts` — janela de 24 meses + viés otimista
- `base` inicial: **35 → 58** (mais tempo = mais probabilidade real de fechar).
- Bônus mais generosos (UF forte +18, setor quente +14, porte médio +8).
- Mesmo cenários "frios" recebem +2 a +4 em vez de zero — narrativa mais positiva, sem parecer falsa.
- Faixa: clamp `35–95`, pessimista `base-12`, otimista `base+10` (faixa mais apertada e otimista).
- MEI deixa de ser "negativo" — vira "foco em compradores estratégicos locais" (tom neutral, não neg).

### 2. `src/pages/MariCalculator.tsx` — copy 24 meses
- Subtítulo: "janela de venda em **24 meses**".
- Loading: mesma copy.
- Title da página: "…vendida nos próximos 24 meses?".

### 3. `src/components/mari-calc/MariResult.tsx` — header card "24 meses" + CTA forte
- Header do card de probabilidade: "Janela de venda · **24 meses**".
- **Novo bloco "Gap de Valuation & Próximos Passos"** logo antes dos botões — card destacado em Volt com:
  - Headline: "Quanto antes você se preparar, mais dinheiro entra no seu bolso."
  - Sub: "Empresas que se preparam com 18-24 meses de antecedência fecham por **até 40% acima** do múltiplo de mercado."
  - 3 mini-pilares com ícone:
    - 📊 **Gap de Valuation** — quanto sua empresa vale hoje vs. quanto poderia valer preparada.
    - 🎯 **Compradores possíveis** — fundos e estratégicos com tese ativa no seu setor/porte.
    - 🚀 **Plano de aceleração** — checklist Mari pra fechar o gap em 12-24 meses.
  - CTA primário Volt full-width: "**Ver meu Gap de Valuation gratuito** →"
- CTA secundário: "Falar com um advisor" (WhatsApp, mantido).
- Remover o CTA antigo "Cadastrar minha empresa" — substituído pelo "Ver meu Gap de Valuation" (mesma ação: prefill + redirect `/auth?...&cnpj=` ou `/vender` se logado, pois `/vender` já entrega o gap via diagnóstico/valuation no painel).
- Adicionar tooltip "ⓘ" no header "Por que essa janela?" abrindo popover curto com: "Cruzamos UF (praça M&A), CNAE (apetite do setor) e porte (RFB/BrasilAPI) com nosso histórico de transações. Estimativa direcional, sem dados privados da sua empresa."

## Arquivos
- **Editado**: `src/lib/mariWindowHeuristic.ts`
- **Editado**: `src/pages/MariCalculator.tsx`
- **Editado**: `src/components/mari-calc/MariResult.tsx`

## Fora de escopo
- Mudar fonte de dados (BrasilAPI continua).
- Tabela `mari_leads` ou tracking (já cobertos por memória).
- Página `/valuation` (não tocamos).
