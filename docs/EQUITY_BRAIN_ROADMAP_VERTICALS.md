# Equity Brain — Roadmap de Verticais

> **Status:** template para o board priorizar próximas verticais a aterrissar
> após validação do piloto ISP/Telecom.

## Princípio

ISP foi escolhido como piloto porque junta:

1. Mercado fragmentado (~5k provedores no Brasil)
2. Onda de consolidação ativa (ticket sob 200M)
3. Dores claras (sucessão, fadiga regulatória, capex)
4. Vispe tem network privilegiado com buyers do setor

Toda vertical futura deve responder positivamente a essas 4 perguntas
antes de virar foco.

---

## Próximas verticais candidatas

Ordem proposta para análise pelo board:

### 1. **Saúde — clínicas e laboratórios médios**
- Mercado: ~30k clínicas multiespecialidade + ~15k laboratórios
- Consolidação: muito ativa (Dasa, Fleury, Hapvida, Rede D'Or)
- Dores: regulação CRM, sucessão de médico-fundador, custo de equipamento
- CNAEs alvo: `8610101` (hospitais), `8630501` (clínicas), `8640202` (lab)
- Buyers prováveis: Dasa, Fleury, Sabin, fundos como Crescera, Pátria
- **Recomendação**: 2º vertical. Ticket alto, M&A maduro.

### 2. **Varejo regional — supermercados de 2 a 8 lojas**
- Mercado: ~15k redes regionais
- Consolidação: ativa (Carrefour, GPA, Mateus comprando por região)
- Dores: pressão de margem, sucessão familiar, e-commerce
- CNAEs alvo: `4711301`, `4711302`, `4712100`
- Buyers prováveis: Mateus, Coco Bambu, Mart Minas, fundos de varejo
- **Recomendação**: 3º vertical. Volume alto, ticket médio.

### 3. **Indústria — metalmecânica e plásticos**
- Mercado: ~50k indústrias metalúrgicas + 12k plásticas
- Consolidação: moderada (mais buyer estratégico que fundo)
- Dores: sucessão, capex de modernização, dependência de 1 cliente
- CNAEs alvo: `2412100`, `2511000`, `2229302`, `2222600`
- **Recomendação**: 4º vertical. Mais nichado, menos comparable.

### 4. **Agro — distribuidores de insumos e serviços**
- Mercado: ~20k revendas + cooperativas regionais
- Consolidação: muito ativa (Lavoro, Agrogalaxy)
- Dores: capital de giro, sucessão, escala de compras
- CNAEs alvo: `4683400`, `4669999`, `0162-8/03`
- **Recomendação**: 5º vertical. Sazonalidade financeira complica.

### 5. **Tech B2B — agências e softwarehouses**
- Mercado: ~80k empresas, mas a maioria abaixo do mínimo M&A
- Consolidação: nichada (CI&T, Stefanini compram seletivamente)
- **Recomendação**: postergar. Múltiplos voláteis, valuation difícil.

---

## Checklist para aprovar nova vertical

Antes de seedar buyers/teses/signals, validar:

- [ ] **Volume mínimo:** ≥ 1k empresas elegíveis no banco da Receita
- [ ] **Buyers identificáveis:** ≥ 10 buyers reais com tese explícita no setor
- [ ] **Teses específicas:** ≥ 3 teses verticais (não só genéricas adaptadas)
- [ ] **Signals próprios:** ≥ 5 signals que só fazem sentido nessa vertical
- [ ] **Network Vispe:** alguém do time tem relacionamento ativo no setor
- [ ] **Backtest viável:** ≥ 3 deals históricos da Vispe naquele setor

Se 4+ checkbox marcados → segue. Caso contrário → adia.

---

## Playbook de aterrissagem (replicar para cada vertical)

Mesmo fluxo da Fase 10 (ISP):

1. **Migration** com signals + teses verticais (idempotente, `ON CONFLICT`)
2. **Seed inicial** de 8-10 buyers reais via migration (`source='seed_<vert>'`)
3. **Filtro vertical** no `useVertical()` (`src/hooks/useVertical.ts`)
4. **Sync de companies** com `cnae_prefixes` específicos
5. **Validação** com BDR fazendo 10-20 calls antes de escalar
6. **Backtest** com mandatos históricos do vertical (ver `EQUITY_BRAIN_BACKTEST.md`)

Tempo estimado por vertical: **2 semanas** de engenharia + **2 semanas** de
validação com BDR.

---

## Critério para parar

Se uma vertical depois de 60 dias:

- BDR não conseguiu fechar nenhuma reunião com mandate signed
- Score top-100 não trouxe nenhum CNPJ que vire deal
- Buyers cadastrados ignoram os matches enviados

→ vertical é **dropada** ou **revisada por completo**. Não mantém vertical
zumbi consumindo recursos do motor.
