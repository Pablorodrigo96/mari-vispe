## Plano: Criar `docs/EQUITY_BRAIN_README.md`

Criar um único arquivo Markdown novo no repositório, sem alterar código ou banco.

### Arquivo a criar
- **Caminho**: `docs/EQUITY_BRAIN_README.md`
- **Conteúdo** (pt-BR): documento descrevendo os dois domínios que convivem no projeto:
  1. **Marketplace PME.B3 (público)** — tabelas em `public`, comportamento reativo, rotas atuais.
  2. **Equity Brain (proprietário Vispe)** — tabelas em `equity_brain`, comportamento ativo (prospecção/BDR), rotas novas (`/equity-brain/*`).
- Inclui a **Regra de ouro**: marketplace alimenta o Equity Brain via signals `intencao_venda_explicita`, e acesso restrito a `role IN ('admin','advisor') OR is_partner_accountant=true OR é_BDR_Vispe`.

### Não inclui
- Nenhuma migração SQL, edge function, rota React ou alteração de RLS — apenas documentação. Os itens listados (rotas `/equity-brain/*`, tabelas em `equity_brain.*`) são referência de roadmap e serão implementados em planos posteriores.

### Diff resumido
```
+ docs/EQUITY_BRAIN_README.md  (novo, ~25 linhas)
```
