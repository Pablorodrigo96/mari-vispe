

## Plano: Transformar /valuation em Landing Page Comercial

Reestruturar a pagina de Valuation como uma landing page de alta conversao, mantendo toda a logica de planos e pagamentos existente mas adicionando secoes comerciais e melhorando o copy.

---

### Estrutura da nova pagina (de cima para baixo)

1. **Hero Imersivo** (reescrever `ValuationTypeSelector` header area)
   - Background dark com particles (manter)
   - Headline mais agressivo: "Quanto vale sua empresa? Descubra agora e surpreenda-se."
   - Sub-headline com pain point: "87% dos empresarios nao sabem o valor real do seu negocio — e perdem dinheiro por isso."
   - CTA unico e claro: "Descobrir Meu Valor Gratis" (scroll para secao de planos)
   - Counter animado: "+1.200 valuations realizados" / "R$ 2.8B em empresas avaliadas" / "Resultado em 3 minutos"

2. **Nova secao: "Por que fazer um Valuation?"** (novo componente `ValuationWhySection.tsx`)
   - 4 cards com icones e copy de dor/beneficio:
     - "Negocie com poder" — Saiba exatamente o valor para nao aceitar ofertas abaixo do justo
     - "Atraia investidores" — Laudo profissional aceito por fundos e compradores
     - "Planeje sua saida" — Tenha clareza sobre o momento certo de vender
     - "Identifique gaps" — Descubra o que esta destruindo valor na sua empresa

3. **Nova secao: "Como funciona"** (novo componente `ValuationHowItWorks.tsx`)
   - 3 steps visuais horizontais com numeros grandes:
     - 1. "Preencha os dados" — Informacoes basicas da empresa (5 min)
     - 2. "Receba seu valor" — Calculo instantaneo por 3 metodologias
     - 3. "Diagnostique e potencialize" — Descubra quanto sua empresa pode valer apos consultoria

4. **Secao de Planos e Compra Avulsa** (manter `ValuationTypeSelector` cards, refatorar)
   - Mover para o meio da pagina como secao propria
   - Adicionar headline "Escolha como calcular o valor da sua empresa"
   - Manter cards de Basico/Master + compra avulsa + iniciar valuation

5. **Metodologia** (manter `MethodologySection`, melhorar copy)
   - Titulo mais comercial: "Tres metodologias, um resultado preciso"
   - Adicionar selo "Baseado em +500 transacoes reais do mercado brasileiro"

6. **Nova secao: "Antes vs Depois da Vispe"** (novo componente `ValuationBeforeAfter.tsx`)
   - Tabela comparativa lado a lado:
     - Sem Valuation: "Negocia no escuro", "Aceita primeira oferta", "Perde 30-50% do valor"
     - Com Valuation PME.B3: "Dados reais de mercado", "Argumenta com laudo", "Valoriza +78% com consultoria"

7. **Trust Section** (manter `TrustSection`, sem mudancas)

8. **Depoimentos** (manter `ValuationTestimonials`, melhorar copy do header)
   - Titulo: "Empresarios que descobriram o valor real dos seus negocios"

9. **Footer CTA** (manter `ValuationFooterCTA`, copy mais urgente)
   - "Cada dia sem saber seu valor e dinheiro na mesa. Comece agora."

---

### Arquivos a criar

| Arquivo | Descricao |
|---|---|
| `src/components/valuation/ValuationWhySection.tsx` | 4 cards de dor/beneficio com icones e framer-motion |
| `src/components/valuation/ValuationHowItWorks.tsx` | 3 steps visuais numerados (timeline horizontal) |
| `src/components/valuation/ValuationBeforeAfter.tsx` | Tabela comparativa antes/depois com destaque visual |

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/pages/Valuation.tsx` | Adicionar novas secoes na ordem correta |
| `src/components/valuation/ValuationTypeSelector.tsx` | Refatorar hero (headline + stats animados) e mover planos para secao separada visualmente |
| `src/components/valuation/MethodologySection.tsx` | Melhorar titulo e adicionar selo de transacoes |
| `src/components/valuation/ValuationTestimonials.tsx` | Atualizar titulo do header |
| `src/components/valuation/ValuationFooterCTA.tsx` | Copy mais urgente e persuasivo |

