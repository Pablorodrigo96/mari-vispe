CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_item TEXT;
  auto_roles TEXT[] := ARRAY['seller', 'buyer'];
  meta_roles JSONB;
  meta_profile TEXT;
  v_full_name TEXT;
  admin_rec RECORD;
  effective_roles TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  meta_profile := NEW.raw_user_meta_data->>'profile';
  meta_roles := NEW.raw_user_meta_data->'roles';

  INSERT INTO public.profiles (user_id, full_name, is_partner_accountant)
  VALUES (NEW.id, v_full_name, COALESCE(meta_profile = 'partner', false));

  INSERT INTO public.subscriptions (user_id, plan, status, multiples_limit, multiples_used, dcf_limit, dcf_used)
  VALUES (NEW.id, 'free', 'active', 1, 0, 0, 0);

  IF meta_profile IS NOT NULL THEN
    IF meta_profile = 'seller' THEN
      effective_roles := ARRAY['seller'];
    ELSIF meta_profile = 'buyer' THEN
      effective_roles := ARRAY['buyer'];
    ELSIF meta_profile = 'partner' THEN
      effective_roles := ARRAY['buyer'];
    ELSIF meta_profile = 'advisor' THEN
      effective_roles := ARRAY['advisor'];
    ELSIF meta_profile = 'franchisee' THEN
      effective_roles := ARRAY['franchisee'];
    END IF;
  ELSIF meta_roles IS NOT NULL AND jsonb_typeof(meta_roles) = 'array' THEN
    SELECT array_agg(value) INTO effective_roles
    FROM jsonb_array_elements_text(meta_roles) AS value;
  END IF;

  IF effective_roles IS NOT NULL THEN
    FOREACH role_item IN ARRAY effective_roles
    LOOP
      IF role_item = ANY(auto_roles) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, role_item::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

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
$function$;