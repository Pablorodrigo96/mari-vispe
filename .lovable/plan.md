

## Matching Avancado: Horizontal + Vertical + Consultor Vispe

### 1. Categorias Similares e Mapa de Relacoes

No `matching-engine`, vou criar um mapa de categorias relacionadas para que o matching nao dependa apenas de categoria identica:

```text
Mapa de Categorias Relacionadas (Horizontal):
food       <-> commerce, services
health     <-> services, education
tech       <-> services, telecom
commerce   <-> food, logistics, services
industry   <-> logistics, commerce
education  <-> tech, services
logistics  <-> industry, commerce
services   <-> tech, health, education, food
telecom    <-> tech
```

Matches de categoria identica mantem +50. Categorias relacionadas recebem +30.

### 2. Novos Criterios de Scoring

Alem dos criterios atuais, adicionar:

- **Faixa de preco de venda (asking_price)**: Se a razao entre precos for > 0.3, bonus de +8 pontos
- **Margem de lucro**: Se ambos tem `annual_profit` e `annual_revenue`, comparar margem. Se diferenca de margem < 15pp, bonus de +7 pontos
- Score maximo teorico sobe de 100 para ~115

### 3. Matching Vertical (Aquisicoes Verticais)

Conceito: Um investidor de um setor diferente que quer crescer verticalmente (ex: uma industria de alimentos comprando um restaurante, ou uma empresa de tech comprando uma empresa de logistica para integrar na cadeia).

Implementacao:
- Criar um segundo mapa chamado `VERTICAL_CHAINS` que define cadeias de valor:
  - Cadeia Alimentar: `industry -> food -> commerce` (producao -> restaurante -> varejo)
  - Cadeia Tech: `tech -> telecom -> services` (desenvolvimento -> infra -> servicos)
  - Cadeia Saude: `health -> education -> services`
  - Cadeia Logistica: `logistics -> industry -> commerce`

- O `matching-engine` recebera um novo parametro `matchType: 'horizontal' | 'vertical' | 'all'`
- Matching horizontal: mesma categoria ou categorias relacionadas
- Matching vertical: categorias na mesma cadeia de valor, com bonus por proximidade na cadeia (+35 para adjacente, +20 para 2 passos)
- Matching "all": combina ambos

### 4. UI - Tabs Horizontal/Vertical na pagina de resultados

No `MatchingResults.tsx`, adicionar tabs para alternar entre:
- **Horizontal** - Empresas do mesmo setor ou setores similares
- **Vertical** - Empresas de setores complementares na cadeia de valor

Cada tab chama o `matching-engine` com o `matchType` correspondente.

### 5. Banner do Consultor Vispe

Adicionar um componente `ConsultorBanner` que aparece na pagina de resultados, com o seguinte conteudo:

> "Voce esta vendo apenas os matches automaticos. Um consultor da Vispe consegue enxergar oportunidades que o algoritmo nao ve - como um investidor estrategico de outro setor que quer crescer de forma vertical e gostaria de investir nesse tipo de empresa, mesmo nao sendo exatamente o mesmo CNAE. Fale com um consultor e descubra oportunidades escondidas."

Com botao de WhatsApp para contato direto.

O banner aparecera:
- Abaixo dos filtros e acima dos resultados
- Com destaque visual (borda accent, icone de usuario/consultor)

### 6. MatchCard - Indicador de tipo

No `MatchCard`, adicionar um badge indicando se o match e "Horizontal" ou "Vertical", para que o usuario entenda a natureza da oportunidade.

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/matching-engine/index.ts` | Mapa de categorias relacionadas, cadeias verticais, novos criterios de scoring, parametro `matchType` |
| `src/pages/MatchingResults.tsx` | Tabs horizontal/vertical, banner Vispe, passagem de `matchType` |
| `src/components/matching/MatchCard.tsx` | Badge de tipo (horizontal/vertical), exibir margem de lucro |
| `src/components/matching/ConsultorBanner.tsx` | Novo componente com CTA para consultor Vispe |

### Detalhes tecnicos do scoring atualizado

```text
Matching Horizontal:
  Mesma categoria:          +50
  Categoria relacionada:    +30
  Mesmo estado:             +25
  Mesma cidade:             +15
  Faturamento similar:      +10
  Preco de venda similar:   +8
  Margem de lucro similar:  +7

Matching Vertical:
  Cadeia adjacente:         +35
  Cadeia 2 passos:          +20
  Mesmo estado:             +25
  Mesma cidade:             +15
  Faturamento similar:      +10
  Preco de venda similar:   +8
  Margem de lucro similar:  +7
```

A query no banco deixa de filtrar por `eq("category", category)` e passa a buscar com `.in("category", [...relatedCategories])` para horizontal, ou `.in("category", [...chainCategories])` para vertical.
