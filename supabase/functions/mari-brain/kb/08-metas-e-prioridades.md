# Metas e prioridades semanais

## Prioridade 1 — fila de matches Hot
- Abra `/equity-brain/match-inbox`.
- Trabalhe os 🔥 (Top 10%) primeiro.
- Para cada Hot: 1 contato em 24h (WhatsApp ou call). Logue como atividade.

## Prioridade 2 — deals congelados
- Pipeline Kanban → cards com badge **vermelho** (>100% SLA).
- Use script de "reativação" (kb 07).
- Mover para etapa adequada após contato.

## Prioridade 3 — avançar etapa
- Cada mandato deve avançar **pelo menos 1 etapa por SLA**.
- Mandatos ainda em "lead" há > 7d: mover para "contato" com NDA enviado, ou para "closed_lost".

## Prioridade 4 — alimentar a engine
- Cada call/email/WhatsApp **deve** virar `crm_activities` (kind correto).
- Marcar matches como "good fit" / "rejected" — alimenta `buyer_revealed_thetas` (adaptive loop).

## Diagnóstico semanal de meta
Pergunte à Mari: "Como está minha meta da semana?" — ela cruza:
- Meta de novos contatos (default: 20/semana por advisor)
- Meta de avanços de etapa (default: 10/semana)
- Meta de IOIs/LOIs (default: 2/mês)
- Deals fechados YTD vs target

## Indicadores pessoais (CRM Hub)
- **Velocity** = média de dias entre etapas.
- **Conversion** = % que avança da etapa N para N+1.
- **Hit rate** = matches contatados / matches recebidos.
- **Pipeline value** = soma de asking_price dos mandatos ativos × probabilidade da etapa.

## Sinais de alerta
- 0 Hot trabalhados em 3 dias → Mari sugere reabrir Inbox.
- Pipeline com >50% dos mandatos vermelhos → revisar carga ou pedir ajuda.
- Buyer sem retorno em 2 outreaches → marcar como "cold", reativar em 60d.
