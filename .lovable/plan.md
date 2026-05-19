## Problema

A tabela `public.listings` ficou sem `GRANT SELECT` para os roles `anon` e `authenticated` após um ajuste recente de segurança. Resultado: PostgREST devolve `401 permission denied for table listings` antes mesmo de avaliar as RLS policies — por isso `/marketplace`, `/painel`, `/mapa` e `/meus-anuncios` não mostram nada.

As RLS policies continuam corretas (já filtram `status = 'active'` para o público, dono vê o seu, admin vê tudo) e os dados expostos publicamente são anônimos (codename, sem CNPJ/endereço real). O fix é só restaurar os GRANTs.

## Plano (1 migration, 100% retrocompatível)

**Migration única:**

```sql
-- Restaura privilégios de tabela (RLS continua sendo a barreira real)
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

-- Tabelas auxiliares usadas pelo marketplace (caso também tenham perdido grants)
GRANT SELECT ON public.listing_views TO anon, authenticated;
GRANT INSERT ON public.listing_views TO anon, authenticated;
```

Sem `DROP`, sem mudar schema, sem mexer em RLS, sem tocar em views (`public_listings` segue como está).

## Validação pós-migration

1. `curl` anônimo no endpoint REST de `listings?status=eq.active` → deve voltar 200 com array.
2. Abrir `/marketplace` deslogado → cards devem renderizar.
3. Abrir `/meus-anuncios` logado como seller → deve ver os próprios.
4. Confirmar que dados sensíveis seguem ocultos: CNPJ/endereço completo só aparece para admin/advisor via `eb_can_view_identity` (não foi tocado).

## O que NÃO muda

- Nenhuma RLS policy é alterada.
- `is_company_visible_in_crm()` e views `*_blind` ficam intactas.
- M&A Fase 0 segue em standby até você aprovar este fix e validar o marketplace.

Aprova rodar a migration?
