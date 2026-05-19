## Diagnóstico

`rafael@vispe.com.br` (user_id `f8059e8d-da2a-4a3f-a839-ad8c145e43b4`) está sem nenhuma linha em `public.user_roles`. Por isso:
- Não passa em `has_role(uid, 'admin')` → não vê CRM completo, painéis admin, todos os mandatos/buyers.
- Não passa em `has_role(uid, 'advisor')` → bloqueado em rotas EB que exigem advisor.
- RLS de `listings`, `mandates`, `buyers`, etc. devolvem só o que o `auth.uid()` dele dono — praticamente nada.

## Ação (1 insert idempotente)

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('f8059e8d-da2a-4a3f-a839-ad8c145e43b4', 'admin'),
  ('f8059e8d-da2a-4a3f-a839-ad8c145e43b4', 'advisor')
ON CONFLICT (user_id, role) DO NOTHING;
```

Retrocompatível: só adiciona linhas, não toca em policies, schema ou outros usuários.

## Validação pós-aplicação

1. `SELECT role FROM user_roles WHERE user_id = 'f8059e8d-…'` → deve retornar `admin` e `advisor`.
2. Rafael recarrega `/equity-brain/crm` → deve ver todos os mandatos e buyers.
3. Sidebar deve mostrar grupos admin (Aprovações, Analytics, etc.).

Após aprovação aplico via `supabase--insert` e confirmo.