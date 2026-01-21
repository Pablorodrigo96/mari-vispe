-- 1. Criar view pública que exclui campos sensíveis (CNPJ, user_id, etc.)
CREATE OR REPLACE VIEW public.public_listings AS
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
COMMENT ON VIEW public.public_listings IS 'View pública que oculta campos sensíveis (CNPJ, user_id, CEP, etc.) dos anúncios ativos';

-- 2. Remover política permissiva de INSERT em notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 3. Criar tabela de rate limiting para proteção contra spam
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice para performance nas consultas de rate limit
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON public.rate_limits(identifier, action, created_at DESC);

-- Habilitar RLS na tabela de rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Política: apenas service_role pode inserir (via edge functions)
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política: apenas service_role pode ler (para verificação)
CREATE POLICY "Service role can read rate limits"
ON public.rate_limits
FOR SELECT
TO service_role
USING (true);

-- Política: limpeza automática de registros antigos (apenas service_role)
CREATE POLICY "Service role can delete old rate limits"
ON public.rate_limits
FOR DELETE
TO service_role
USING (created_at < now() - interval '1 hour');

-- 4. Criar função para limpeza automática de rate limits antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE created_at < now() - interval '1 hour';
END;
$$;