# Vispe Equity Brain — Visão de Domínios

Este projeto tem DOIS domínios convivendo:

## 1. Marketplace PME.B3 (público)

- Tabelas no schema `public`: listings, buyer_profiles, valuations, capital_*, partner_*.
- Reativo: usuário cadastra, sistema responde.
- Rotas atuais: /, /marketplace, /vender, /capital, /valuation, /admin/*.

## 2. Equity Brain (proprietário Vispe)

- Tabelas no schema `equity_brain`: companies, company_signals, company_scores, buyers, buyer_theses, matches, opportunities_ready, call_feedback, events, investment_theses.
- Ativo: sistema prospecta, BDR executa.
- Rotas novas: /equity-brain, /equity-brain/empresa/:cnpj, /equity-brain/buyer/:id, /equity-brain/grafo, /equity-brain/mapa.

## Regra de ouro

- O marketplace alimenta o Equity Brain (listings publicados viram signals "intencao_venda_explicita").
- O Equity Brain NÃO é exposto ao usuário comum. Acesso restrito a:

  ```
  role IN ('admin', 'advisor') OR is_partner_accountant=true OR é_BDR_Vispe.
  ```

## Sincronização Marketplace → Equity Brain (implementada)

A integração entre os dois domínios é feita por:

1. **Trigger automático** `sync_listing_to_equity_brain` em `public.listings`
   (AFTER INSERT/UPDATE) — chama `equity_brain.upsert_company_from_listing(uuid)`
   para garantir que toda empresa anunciada vire um registro em
   `equity_brain.companies` com `has_listing=true` e `source='marketplace_listing'`.

2. **Edge function** `sync-listings-to-equity-brain` (admin-only) — re-sincroniza
   todas as listings em lote e dispara a pipeline:
   `compute-signals → calculate-scores → refresh-opportunities`.
   Disponível como botão "Sincronizar marketplace" em `/equity-brain`.

### CNPJs sintéticos `LST...`

Listings sem CNPJ preenchido recebem um identificador determinístico no formato
`LST` + 11 dígitos derivados do `listing.id`. Isso preserva a chave única em
`equity_brain.companies` e identifica visualmente empresas originadas de
anúncios sem CNPJ. Quando o usuário editar o anúncio e preencher o CNPJ real,
um novo registro com o CNPJ real será criado (o sintético permanece, podendo
ser arquivado em manutenção futura).

### Mapeamento categoria → setor M&A

| `listings.category` | `equity_brain.setor_ma` |
|---------------------|-------------------------|
| telecom             | telecom                 |
| tech                | saas                    |
| health              | saude                   |
| education           | educacao                |
| services            | servicos_b2b            |
| logistics           | servicos_b2b            |
| agro                | agro                    |
| energy              | energia                 |
| commerce / food     | varejo                  |
| construction / industry | industria           |
