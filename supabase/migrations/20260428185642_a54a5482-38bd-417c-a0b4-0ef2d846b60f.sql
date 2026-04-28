CREATE TABLE IF NOT EXISTS public.system_bots (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.system_bots (id, name)
VALUES ('00000000-0000-0000-0000-00000000b001', 'equity_brain_buyer_mirror')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.buyer_pseudonym(_id uuid, _tipo text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(_tipo,''))
           WHEN 'estrategico' THEN 'Comprador Estratégico'
           WHEN 'fundo_pe' THEN 'Fundo PE'
           WHEN 'pe_platform' THEN 'Plataforma PE'
           WHEN 'family_office' THEN 'Family Office'
           WHEN 'corporate_vc' THEN 'CVC'
           WHEN 'search_fund' THEN 'Search Fund'
           WHEN 'investidor_anjo' THEN 'Investidor'
           ELSE COALESCE(initcap(replace(_tipo,'_',' ')),'Comprador')
         END
         || ' #'
         || CASE lower(coalesce(_tipo,''))
              WHEN 'fundo_pe' THEN 'F'
              WHEN 'pe_platform' THEN 'P'
              WHEN 'family_office' THEN 'O'
              WHEN 'corporate_vc' THEN 'V'
              WHEN 'search_fund' THEN 'S'
              ELSE 'A'
            END
         || lpad(((abs(hashtext(_id::text)) % 999) + 1)::text, 3, '0');
$$;

CREATE OR REPLACE FUNCTION public.buyer_neutral_description(
  _setores text[], _ufs text[], _tmin numeric, _tmax numeric
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both ' · ' FROM
    COALESCE('Setores: ' || array_to_string(_setores[1:3], ', '), '')
    || CASE WHEN array_length(_ufs,1) > 0 THEN ' · Foco: ' || array_to_string(_ufs[1:5], ', ') ELSE '' END
    || CASE
         WHEN _tmin IS NOT NULL AND _tmax IS NOT NULL THEN
           ' · Ticket R$ ' || round(_tmin/1000000, 1) || '–' || round(_tmax/1000000, 1) || 'M'
         WHEN _tmax IS NOT NULL THEN ' · Ticket até R$ ' || round(_tmax/1000000, 1) || 'M'
         WHEN _tmin IS NOT NULL THEN ' · Ticket a partir de R$ ' || round(_tmin/1000000, 1) || 'M'
         ELSE ''
       END
  );
$$;

ALTER TABLE public.buyer_profiles ADD COLUMN IF NOT EXISTS source_eb_buyer_id uuid;
ALTER TABLE public.buyer_profiles DROP CONSTRAINT IF EXISTS buyer_profiles_source_eb_buyer_id_key;
ALTER TABLE public.buyer_profiles ADD CONSTRAINT buyer_profiles_source_eb_buyer_id_key UNIQUE (source_eb_buyer_id);