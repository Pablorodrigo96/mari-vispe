
-- 1. Tabela advisor_requests
CREATE TABLE IF NOT EXISTS public.advisor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own advisor requests"
  ON public.advisor_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advisor requests"
  ON public.advisor_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all advisor requests"
  ON public.advisor_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update advisor requests"
  ON public.advisor_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Atualiza handle_new_user: advisor/franchisee NÃO ganham role direto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  role_item TEXT;
  auto_roles TEXT[] := ARRAY['seller', 'buyer'];
  pending_roles TEXT[] := ARRAY['advisor', 'franchisee'];
  meta_roles JSONB;
  v_full_name TEXT;
  admin_rec RECORD;
BEGIN
  v_full_name := NEW.raw_user_meta_data->>'full_name';

  -- Profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, v_full_name);

  -- Subscription gratuita
  INSERT INTO public.subscriptions (user_id, plan, status, multiples_limit, multiples_used, dcf_limit, dcf_used)
  VALUES (NEW.id, 'free', 'active', 1, 0, 0, 0);

  meta_roles := NEW.raw_user_meta_data->'roles';
  IF meta_roles IS NOT NULL AND jsonb_typeof(meta_roles) = 'array' THEN
    FOR role_item IN SELECT jsonb_array_elements_text(meta_roles)
    LOOP
      -- Auto-grant: seller, buyer
      IF role_item = ANY(auto_roles) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, role_item::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

      -- Advisor: cria request, NÃO concede role
      ELSIF role_item = 'advisor' THEN
        INSERT INTO public.advisor_requests (user_id, status)
        VALUES (NEW.id, 'pending');

        FOR admin_rec IN
          SELECT user_id FROM public.user_roles WHERE role = 'admin'
        LOOP
          INSERT INTO public.notifications (user_id, type, title, content)
          VALUES (
            admin_rec.user_id,
            'system',
            'Novo pedido de Assessor pendente',
            COALESCE(v_full_name, 'Um usuário') || ' solicitou acesso como Assessor.'
          );
        END LOOP;

      -- Franchisee: cria request, NÃO concede role
      ELSIF role_item = 'franchisee' THEN
        INSERT INTO public.franchisee_requests (user_id, status)
        VALUES (NEW.id, 'pending')
        ON CONFLICT DO NOTHING;

        FOR admin_rec IN
          SELECT user_id FROM public.user_roles WHERE role = 'admin'
        LOOP
          INSERT INTO public.notifications (user_id, type, title, content)
          VALUES (
            admin_rec.user_id,
            'system',
            'Novo pedido de Franqueado pendente',
            COALESCE(v_full_name, 'Um usuário') || ' solicitou acesso como Franqueado.'
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Função aprovar advisor
CREATE OR REPLACE FUNCTION public.approve_advisor_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.advisor_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request not found or already processed';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'advisor'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.advisor_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (v_user_id, 'system', 'Acesso de Assessor aprovado',
          'Seu acesso como Assessor foi aprovado. Faça login novamente para acessar o Equity Brain.');
END;
$$;

-- 4. Função rejeitar advisor
CREATE OR REPLACE FUNCTION public.reject_advisor_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.advisor_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  UPDATE public.advisor_requests
  SET status = 'rejected', reason = p_reason,
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (v_user_id, 'system', 'Pedido de Assessor não aprovado',
          COALESCE(p_reason, 'Seu pedido de acesso como Assessor não foi aprovado.'));
END;
$$;

-- 5. Função aprovar franchisee
CREATE OR REPLACE FUNCTION public.approve_franchisee_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.franchisee_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request not found or already processed';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'franchisee'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.franchisee_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (v_user_id, 'system', 'Acesso de Franqueado aprovado',
          'Seu acesso como Franqueado foi aprovado. Faça login novamente para configurar suas regiões.');
END;
$$;

-- 6. Função rejeitar franchisee
CREATE OR REPLACE FUNCTION public.reject_franchisee_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.franchisee_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  UPDATE public.franchisee_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (v_user_id, 'system', 'Pedido de Franqueado não aprovado',
          COALESCE(p_reason, 'Seu pedido de acesso como Franqueado não foi aprovado.'));
END;
$$;
