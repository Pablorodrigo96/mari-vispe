-- Tabela de mensagens de contato
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para mensagens
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode enviar mensagem (sem autenticação necessária)
CREATE POLICY "Anyone can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Donos do anúncio podem ver mensagens
CREATE POLICY "Listing owners can view messages"
  ON public.messages FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'promo', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida de não lidas
CREATE INDEX idx_notifications_user_unread 
  ON public.notifications(user_id, is_read) 
  WHERE is_read = FALSE;

-- RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas notificações
CREATE POLICY "Users can view own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

-- Usuários podem atualizar (marcar como lida)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Sistema pode inserir notificações (via trigger)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Trigger para criar notificação quando nova mensagem chegar
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  listing_owner_id UUID;
  listing_title TEXT;
BEGIN
  -- Buscar dono do anúncio
  SELECT user_id, title INTO listing_owner_id, listing_title
  FROM public.listings
  WHERE id = NEW.listing_id;

  -- Criar notificação para o dono do anúncio
  INSERT INTO public.notifications (user_id, type, title, content, listing_id)
  VALUES (
    listing_owner_id,
    'message',
    'Nova mensagem de interessado',
    'Você recebeu uma mensagem de ' || NEW.sender_name || ' sobre "' || listing_title || '"',
    NEW.listing_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- Trigger para criar notificação promocional quando um anúncio básico é criado
CREATE OR REPLACE FUNCTION public.create_promo_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar notificação promocional para anúncios no plano básico
  IF NEW.plan = 'basic' THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.user_id,
      'promo',
      'Destaque seu anúncio!',
      'Seu anúncio "' || NEW.title || '" está no plano gratuito. Impulsione com o plano Master e apareça no topo das buscas!',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_listing_promo
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_promo_notification();