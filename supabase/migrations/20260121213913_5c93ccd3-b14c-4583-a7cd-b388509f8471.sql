-- Corrigir a view removendo SECURITY DEFINER (usar SECURITY INVOKER que é o padrão)
DROP VIEW IF EXISTS public.public_listings;

CREATE VIEW public.public_listings 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  title, 
  category, 
  description, 
  city, 
  state, 
  neighborhood,
  annual_revenue, 
  annual_profit, 
  asking_price, 
  hide_price,
  foundation_year, 
  square_meters, 
  rent_value, 
  iptu_value,
  sale_reason, 
  images, 
  plan, 
  status, 
  created_at,
  updated_at
FROM public.listings
WHERE status = 'active';

-- Comentário explicando a view
COMMENT ON VIEW public.public_listings IS 'View pública segura (SECURITY INVOKER) que oculta campos sensíveis dos anúncios ativos';