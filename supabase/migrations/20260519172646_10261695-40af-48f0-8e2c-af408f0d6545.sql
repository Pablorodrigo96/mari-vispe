-- Revoke sensitive columns from anonymous users on public.listings.
-- The RLS policy "Public can view active listings" still allows row visibility,
-- but anon can no longer SELECT these specific columns. Authenticated users
-- keep full access via the table-level grants already in place.

REVOKE SELECT (cnpj, street, cep, annual_revenue, annual_profit)
  ON public.listings FROM anon;