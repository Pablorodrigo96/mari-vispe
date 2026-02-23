

## Melhorias na Aba Valuation

### 1. Botoes de compra avulsa habilitados

Os botoes "Comprar (em breve)" dos cards de compra individual (Multiplos R$99 e DCF R$490) estao com `disabled` hardcoded. Vou remover o `disabled` e conectar ao fluxo de pagamento que ja existe no `ValuationPaymentModal` (que ja chama `create-checkout` no Stripe).

**Arquivo:** `src/components/valuation/ValuationTypeSelector.tsx`
- Linhas 237 e 268: remover `disabled` dos botoes de compra avulsa
- Atualizar texto de "Comprar (em breve)" para "Comprar Agora"

---

### 2. Botao do Plano Basico invisivel (branco sobre branco)

O botao "Comecar Gratis" usa `variant="outline"` com classes `border-white/20 text-white hover:bg-white/10`, mas quando o usuario esta logado e nao e Master, aparece um `div` com texto branco sobre fundo branco. Vou corrigir adicionando cores de contraste adequadas ao botao do Plano Basico.

**Arquivo:** `src/components/valuation/ValuationTypeSelector.tsx`
- Alterar o botao "Comecar Gratis" para usar `bg-white text-gray-900 hover:bg-white/90` garantindo visibilidade

---

### 3. Preco do Plano Master: R$297 para R$697/mes

Atualizar o valor exibido em todos os locais:

**Arquivos afetados:**
- `src/components/valuation/ValuationTypeSelector.tsx` (linha 169)
- `src/components/valuation/ValuationPaymentModal.tsx` (linha 180)
- `src/components/sell/PlansPreview.tsx` (se referencia o plano Master)
- `src/components/sell/wizard/PlanSelectionModal.tsx` (linha com R$297)

---

### 4. Nova funcionalidade: Certificador de Valuation

Uma ferramenta onde o usuario (comprador ou vendedor) insere os dados de um valuation que recebeu e o sistema roda internamente o calculo por Multiplos de Mercado para comparar e gerar um relatorio de assertividade.

#### Fluxo:
1. Usuario acessa "/valuation/certificador" (nova rota)
2. Preenche: segmento, receita anual, margem EBITDA, margem lucro liquido e o valor do valuation recebido
3. O sistema roda `calculateValuation()` (mesmo calculo de Multiplos) nos bastidores
4. Compara o valor auditado com o valor apresentado
5. Gera relatorio de assertividade com percentual de desvio e classificacao (Muito Abaixo / Abaixo / Adequado / Acima / Muito Acima)
6. Salva o log na tabela `valuation_history` com `valuation_type: 'certification'`
7. O usuario NAO paga por essa verificacao

#### Arquivos a criar:
- `src/pages/ValuationCertifier.tsx` — pagina principal do certificador
- `src/components/valuation/CertifierWizard.tsx` — wizard com 2 steps (dados financeiros + valor recebido, resultado)
- `src/components/valuation/CertificationReport.tsx` — componente do relatorio de assertividade

#### Arquivos a modificar:
- `src/App.tsx` — adicionar rota `/valuation/certificador`
- `src/components/valuation/ValuationTypeSelector.tsx` — adicionar card do Certificador na secao de planos/ferramentas
- `src/pages/Valuation.tsx` — adicionar handler para navegacao ao certificador

#### Logica do relatorio de assertividade:
```text
desvio = (valor_apresentado - valor_auditado) / valor_auditado * 100

| Desvio          | Classificacao    | Cor     |
|-----------------|------------------|---------|
| < -30%          | Muito Abaixo     | red     |
| -30% a -10%     | Abaixo           | orange  |
| -10% a +10%     | Adequado         | green   |
| +10% a +30%     | Acima            | orange  |
| > +30%          | Muito Acima      | red     |
```

#### Migracao de banco:
- Adicionar suporte a `valuation_type = 'certification'` na tabela `valuation_history` (ja suporta, e um campo `text`)
- Armazenar no campo `result` (JSON) os dados do relatorio: valor apresentado, valor auditado, desvio percentual, classificacao

---

### Secao Tecnica — Resumo de alteracoes

| Arquivo | Acao |
|---|---|
| `src/components/valuation/ValuationTypeSelector.tsx` | Habilitar botoes compra, corrigir botao branco, atualizar preco Master R$697, adicionar card Certificador |
| `src/components/valuation/ValuationPaymentModal.tsx` | Atualizar preco exibido para R$697 |
| `src/components/sell/wizard/PlanSelectionModal.tsx` | Atualizar preco Master para R$697 |
| `src/pages/ValuationCertifier.tsx` | Criar pagina do certificador |
| `src/components/valuation/CertifierWizard.tsx` | Criar wizard do certificador |
| `src/components/valuation/CertificationReport.tsx` | Criar relatorio de assertividade |
| `src/App.tsx` | Adicionar rota `/valuation/certificador` |
| `src/pages/Valuation.tsx` | Adicionar navegacao ao certificador |
| Migracao SQL | Nenhuma necessaria (campo `valuation_type` ja e text livre) |

