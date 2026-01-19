-- Adicionar campos para controlar múltiplos na tabela subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS multiples_limit INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS multiples_used INTEGER NOT NULL DEFAULT 0;

-- Adicionar campos para bloquear edição na tabela valuation_history
ALTER TABLE public.valuation_history 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT now();

-- Criar tabela de compras avulsas de valuation
CREATE TABLE public.valuation_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiples', 'dcf')),
  price_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE public.valuation_purchases ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para valuation_purchases
CREATE POLICY "Users can view own purchases" 
  ON public.valuation_purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" 
  ON public.valuation_purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases" 
  ON public.valuation_purchases FOR UPDATE 
  USING (auth.uid() = user_id);

-- Atualizar função handle_new_user para usar novos limites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Plano Básico: 1 múltiplo grátis, 0 DCF
  INSERT INTO public.subscriptions (user_id, plan, status, multiples_limit, multiples_used, dcf_limit, dcf_used)
  VALUES (NEW.id, 'free', 'active', 1, 0, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;