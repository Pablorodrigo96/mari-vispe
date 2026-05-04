
# FASE 3 — Calculadora pública `/mari`

## Objetivo
Transformar a rota `/mari` (hoje aliasada para `Valuation`) numa **calculadora pública** de janela de venda por CNPJ — vitrine do motor da Mari, sem login, com captura de lead.

## Princípio
- 100% pública (sem auth wall até o final).
- Usa edge function `company-lookup` que já existe.
- Mostra **probabilidade + faixa + 3 razões + abstenção** (mesma narrativa da Carroceria) para criar coerência.
- Sempre converte: CTA dupla (assinar/entrar em contato) ao final.
- **Não** mostra valor de venda em R$ (isso é Valuation, fica em `/valuation`).

## Fluxo
```text
1. Hero: "Quanto tempo até sua empresa ser vendida?"
2. Input CNPJ (com máscara) → botão "Calcular"
3. Loading 2s (sensação de "rodando o motor")
4. Resultado:
   ├─ Empresa identificada (razão social, UF, CNAE) — vem do company-lookup
   ├─ Card grande: % janela 12m + faixa pessimista/otimista
   ├─ 3 razões (badges com ícones, geradas por heurística do CNAE/porte/UF)
   ├─ Badge "Abstenção" se dados insuficientes (CNAE genérico, sem porte)
   └─ CTAs: [Quero falar com um advisor] [Cadastrar minha empresa]
5. Disclaimer: "Estimativa direcional. Não é recomendação de venda."
```

## Heurística (sem chamar IA)
- Base: 35%.
- +15% se UF ∈ {SP, RJ, MG, RS, PR, SC}.
- +10% se CNAE setor = ISP/Tech/Saúde/Educação.
- +5% se porte = Médio/Grande.
- −10% se MEI/ME.
- Faixa: ±15 pp.
- Abstenção: dispara quando fonte retornou < 3 campos válidos.

## Arquivos

### Criar
- `src/pages/MariCalculator.tsx` — página pública.
- `src/components/mari-calc/CnpjInput.tsx` — input mascarado.
- `src/components/mari-calc/MariResult.tsx` — card de resultado.
- `src/lib/mariWindowHeuristic.ts` — função pura `computeWindow({ uf, cnaeSection, porte })`.

### Editar
- `src/App.tsx`: trocar `<Route path="/mari" element={<Valuation />} />` por `<Route path="/mari" element={<MariCalculator />} />`. Manter `/valuation` como antes.
- `src/components/layout/Header.tsx`: adicionar item público "Calculadora" → `/mari` (se ainda não tiver).

### Não tocar
- `src/pages/Valuation.tsx`, hooks de valuation, edge functions de valuation.
- Equity Brain.
- Cockpit (Fase 2).

## Captura de lead
Quando usuário clicar em qualquer CTA pós-resultado, redireciona pra `/auth?tab=signup&redirect=/painel&role=seller&cnpj={cnpj}`. (Auth já aceita query params da Fase 1; o `cnpj` fica como hint só na URL — sem persistir nesta fase pra não mexer em schema.)

## Critério de pronto
- `/mari` carrega sem login, com input CNPJ funcional.
- Após "Calcular", mostra empresa real (via `company-lookup`) + janela estimada + razões + CTAs.
- CNPJ inválido / lookup vazio → mensagem clara, sem quebrar.
- Mobile: tudo em uma coluna; desktop: hero centralizado max-width 720px.
- Nenhuma migration, nenhuma edge function nova.
