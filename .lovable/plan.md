## Problema

100% dos signups estão falhando com erro 500 (`Database error saving new user`). Auth logs mostram:

```
null value in column "is_partner_accountant" of relation "profiles" violates not-null constraint
```

## Causa

No trigger `public.handle_new_user`, a linha:

```sql
INSERT INTO public.profiles (user_id, full_name, is_partner_accountant)
VALUES (NEW.id, v_full_name, (meta_profile = 'partner'));
```

Quando `raw_user_meta_data->>'profile'` é `NULL` (ex.: signups que mandam só `roles` array, ou o novo wizard que mudou o nome do campo), a expressão `NULL = 'partner'` retorna **`NULL`**, não `false` — violando o NOT NULL da coluna `is_partner_accountant`.

## Fix (1 migration, mudança cirúrgica)

Recriar `handle_new_user` trocando a expressão por:

```sql
COALESCE(meta_profile = 'partner', false)
```

Nada mais muda — fluxo de roles, advisor_requests, franchisee_requests, notifications e subscriptions seguem idênticos.

## Verificação pós-fix

1. Smoke test: criar usuário de teste via tela `/auth` com perfil "Franqueado" (caso do screenshot) → deve criar conta + `franchisee_requests` pendente.
2. Conferir auth logs: zero erros 500 em `/signup`.
3. Conferir que `profiles.is_partner_accountant = false` para o novo usuário.

## Arquivos

- `supabase/migrations/<novo>.sql` — `CREATE OR REPLACE FUNCTION public.handle_new_user` com o `COALESCE`.

Sem mudanças de frontend.
