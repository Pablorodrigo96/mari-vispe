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
