## Contexto

Banco mostra: **86 mandatos**, **0 com `valor_operacao` preenchido** e **0 atividades**. O schema da Fase 4 está pronto, falta operacionalizar. Abrir o form rico para cada um dos 86 mandatos é lento. A solução é edição rápida direto no Pipeline Kanban (e nas tabelas).

## O que vai mudar

### 1. Novo componente `QuickEditPopover`
`src/components/equity-brain/crm/QuickEditPopover.tsx`

Modal compacto centralizado que edita os 5 campos mais usados de um mandato sem sair do Kanban:
- Valor da operação (R$)
- Faturamento Vispe (R$)
- Comissão (%) — com preview ao vivo da comissão calculada (`valor × pct/100`)
- Contato (nome)
- Telefone / WhatsApp

Salva via `update` direto na view `eb_mandates` (que já tem RLS de admin). Invalida queries `pipeline-kanban` e `crm` para refletir nas demais telas.

### 2. `PipelineKanbanPage` ganha botão de edição em cada card

Cada card recebe:
- Ícone de lápis no canto superior direito → abre o popover
- Quando o card está "sem valor", o texto "sem valor" vira um botão "+ valor" que abre o popover

O drag-and-drop continua funcionando (uso `e.stopPropagation()` nos botões para não disparar drag/navegação). O título do card vira `<Link>` para o detalhe; o resto do card é a área de drag.

### 3. Memória atualizada
Adicionar entrada em `mem://features/phase4-mna-monday-replacement` registrando o componente reutilizável `QuickEditPopover` para uso futuro também nas tabelas Mandatos/Buyers.

## O que NÃO entra agora

- Edição inline nas tabelas `MandatesTable` / `BuyersTable` (fica para um próximo passo, mas o componente já será reutilizável)
- Atribuição de responsável (precisa carregar lista de admins — fica para 4.G.2)
- Forecast/comissão projetada no Dashboard Executivo (fica como 4.I)

## Arquivos afetados

```
src/components/equity-brain/crm/QuickEditPopover.tsx   (NOVO)
src/pages/equity-brain/PipelineKanbanPage.tsx          (editar cards + estado de edição)
mem://features/phase4-mna-monday-replacement           (atualizar)
```

Sem migrações de banco. Sem novas rotas. Sem novas dependências.
