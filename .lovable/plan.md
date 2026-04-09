

## Plano: Página "Potencial da Carteira" para Assessores e Gestores de Parcerias

### Objetivo
Criar uma página `/potencial-carteira` onde assessores (advisors), contadores parceiros e gestores de parcerias visualizem o potencial de receita da sua carteira de clientes em 3 cenários: Pessimista, Realista e Otimista.

### Cenários de Receita

| Cenário | Serviços | Receita estimada por cliente |
|---|---|---|
| Pessimista | CFO as a Service | R$ 3.000/mês (R$ 36.000/ano) |
| Realista | CFO + Aceleração Comercial | R$ 7.500/mês (R$ 90.000/ano) |
| Otimista | CFO + AC + M&A | R$ 15.000/mês (R$ 180.000/ano) + success fee |

Os valores serão configuráveis via constantes no código. A receita total é calculada multiplicando pelo número de clientes na carteira (listagens ativas do assessor ou empresas captadas).

### Fonte de dados
- Para advisors/contadores: `listings` onde `user_id` = usuário logado (empresas que eles cadastraram)
- Para admins/gestores: todos os advisors e seus respectivos clientes
- Fallback: se não houver dados reais, permite input manual do número de clientes

### Layout da Página

1. **Hero**: Título "Potencial da Sua Carteira", subtítulo motivacional, badge "Simulador de Receita"
2. **Input de carteira**: Slider ou input numérico para ajustar quantidade de clientes (pré-preenchido com dados reais se disponíveis)
3. **3 Cards de cenário lado a lado** (responsivo):
   - Card Pessimista (cinza/neutro): ícone, nome do serviço, receita mensal por cliente, receita mensal total, receita anual total
   - Card Realista (azul/accent): destacado como "Recomendado", mesma estrutura
   - Card Otimista (dourado/premium): badge "Máximo Potencial", inclui success fee estimado
4. **Gráfico de barras comparativo** (Recharts): 3 barras com receita anual por cenário
5. **Tabela detalhada**: Breakdown por cliente (se dados reais disponíveis) ou por faixa de clientes
6. **CTA**: "Falar com o time comercial" (link WhatsApp)

### Acesso
- Visível para roles: `advisor`, `admin`, e profiles com `is_partner_accountant = true`
- Link no dropdown do Header para advisors: "Potencial da Carteira"

### Arquivos

| Artefato | Ação |
|---|---|
| `src/pages/PortfolioPotential.tsx` | **Novo**: página completa com simulador, cards, gráfico Recharts |
| `src/App.tsx` | Adicionar rota `/potencial-carteira` |
| `src/components/layout/Header.tsx` | Adicionar link no dropdown para advisors/contadores |

