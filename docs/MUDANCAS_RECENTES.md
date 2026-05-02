# Mudanças Recentes — Equity Brain

## Maio 2026

### Reorganização do menu
Sidebar reagrupada por **Operação** (Hoje, Oportunidades, Pipeline, Mandatos, Compradores, Calls, Mercado), **Dashboards** e **Admin** (apenas para admins). Hoje em destaque Volt.

### Drawer lateral universal
Click em qualquer card de deal (Hoje, Pipeline, Mandatos, Oportunidades) abre um **drawer** à direita com:
- Metadados do mandato
- Ações rápidas (WhatsApp, nota, abrir página)
- **Timeline unificada** consolidando 5 fontes (CRM, WhatsApp, transições de pipeline, subtarefas, eventos do deal)

URL não muda — você não perde o contexto da tela atual.

### Motor de insights proativos da Mari
Nova tabela `mari_insights` + cron diário (06:00 UTC). A Mari gera alertas categorizados:
- **Urgência** — mandato vencendo, deal parado
- **Risco** — fase travada >30d
- **Oportunidade** e **Aprendizado** (em breve, mais regras)

Cards aparecem no topo da tela **Hoje**. Você pode dispensar individualmente.

### Sidebar responsivo
- Desktop ≥1024px: aberta por padrão, click no logo colapsa para ícones
- Tablet 768–1023px: colapsa automaticamente
- Mobile <768px: vira gaveta com hambúrguer no header
- Estado persiste entre sessões

### Limpeza de duplicatas
Nova tela **/equity-brain/admin/dedupe** para mesclar empresas/buyers duplicados sem perder histórico.

### Smoke tests diários
`mari_ops.daily_smoke_tests()` agora inclui:
- Contagem de mandates, matches ativos, buyers reais
- Frescor das materialized views (<24h)
- Geração de insights nas últimas 24h
