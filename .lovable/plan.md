## Problema

Hoje o `/admin/usuarios` lista nome + role + WhatsApp + cadastro, e só. Não tem como abrir o usuário e ver o que ele criou: anúncios, valuations, captações, documentos, números financeiros, lead Mari, assinatura, atividades. O menu "..." só edita perfil / muda role / reseta senha.

## Solução

Criar uma página de detalhe do usuário (admin/advisor) acessível ao clicar no nome ou em "Ver detalhes" no dropdown da lista — uma visão 360° agregando tudo que esse user_id tocou na plataforma.

### Rota
`/admin/usuarios/:userId` → novo arquivo `src/pages/admin/AdminUserDetail.tsx`, registrado em `src/App.tsx` dentro do `RequireRole(admin)` igual aos outros admin/*.

### Layout (uma página, abas internas)

```text
┌─ Header ────────────────────────────────────────┐
│ Avatar · Nome · email · telefone · roles · WA   │
│ Cadastro · Última atividade · [Editar] [Senha]  │
└─────────────────────────────────────────────────┘

┌─ KPIs (6 cards) ────────────────────────────────┐
│ Anúncios │ Valuations │ Captações │ Docs │ Lead │ Plano
└─────────────────────────────────────────────────┘

Tabs:
  Visão Geral · Anúncios · Valuations · Captações ·
  Documentos · Atividade · Notas Admin
```

### Fontes de dados (todas já existem no schema)

| Aba | Tabela / view | Filtro |
|---|---|---|
| Perfil | `profiles` | `user_id` |
| Roles | `user_roles` | `user_id` |
| Assinatura | `subscriptions` | `user_id` |
| Anúncios | `listings` | `user_id` — mostra título, codinome, status, preço, views, datas, link `/meus-anuncios/:id` |
| Valuations | `valuation_history` | `user_id` — tipo (multiplos/dcf/diagnostic), valor calculado, data, link de download |
| Captações | `capital_requests` | `user_id` — valor, status, score |
| Documentos | `entity_documents` (ou bucket `vdr/` listado por `owner_id`) | `user_id` — nome, tipo, tamanho, link assinado |
| Lead Mari | `mari_leads` | `user_id` — CNPJ, janela, status (signup/listed) |
| Atividade | `crm_activities` + `access_logs` + `notifications` | `user_id` ou `target_user_id` — timeline unificada |
| Notas | `eb_entity_notes` (`entity_type='profile'`) | `entity_id=user_id` |

### Componentes

- `src/pages/admin/AdminUserDetail.tsx` — orquestra fetch + tabs.
- `src/components/admin/user-detail/UserHeader.tsx` — bloco de identidade + ações (Editar, Senha, Excluir, Suspender).
- `src/components/admin/user-detail/UserKpis.tsx` — 6 cards numéricos.
- `src/components/admin/user-detail/UserListingsTab.tsx`
- `src/components/admin/user-detail/UserValuationsTab.tsx`
- `src/components/admin/user-detail/UserCapitalTab.tsx`
- `src/components/admin/user-detail/UserDocumentsTab.tsx` — reusa lógica do `EntityDocChecklist` mas em modo read-only com download via signed URL.
- `src/components/admin/user-detail/UserActivityTab.tsx` — timeline unificada ordenada por `created_at desc`.
- `src/components/admin/user-detail/UserNotesTab.tsx` — reusa `useEntityNotes('profile', userId)`.

### Hook agregador
`src/hooks/useAdminUserDetail.ts` — uma única `useQuery(['admin-user-detail', userId])` que dispara as ~8 queries em paralelo via `Promise.all` e devolve `{ profile, roles, subscription, listings, valuations, capital, docs, mariLead, activities, notes }`.

### Integração com a lista
`src/pages/admin/AdminUsers.tsx`:
- Nome do usuário vira `<button>` que faz `navigate('/admin/usuarios/' + user_id)`.
- Dropdown "..." ganha primeiro item **"Ver detalhes"** apontando para a mesma rota.

### Segurança
- Página gated por `RequireRole admin` (sem `advisor` por enquanto — captações/valuations contêm PII sensível). Se quiser advisor depois, basta acrescentar.
- Documentos: gerar signed URL via `supabase.storage.from(bucket).createSignedUrl(path, 60)` no clique, nunca expor caminho cru.
- Acesso registrado em `access_logs` (kind=`admin_user_view`) via `useTeaserAccessLog` para LGPD.

### Performance
- Todas as queries com `limit(50)` por aba + paginação simples "carregar mais".
- KPIs vêm de `count: 'exact', head: true` (não puxa linhas).

## Fora de escopo (deixar para depois)
- Edição de listings/valuations a partir dessa tela (apenas links pra páginas existentes).
- Impersonate / "View as user".
- Export CSV consolidado do usuário.

## Entregáveis
1. Nova rota e página `AdminUserDetail`.
2. Hook agregador + 6 componentes de aba.
3. Lista `AdminUsers` com link para o detalhe.
4. Log LGPD do acesso admin.
