
-- =========================
-- 1) Quiz diário
-- =========================
CREATE TABLE IF NOT EXISTS public.mari_daily_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date UNIQUE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text,
  symbol text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mari_daily_quiz TO anon, authenticated;
GRANT ALL ON public.mari_daily_quiz TO service_role;
ALTER TABLE public.mari_daily_quiz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz public read" ON public.mari_daily_quiz FOR SELECT USING (true);

-- =========================
-- 2) Respostas do usuário
-- =========================
CREATE TABLE IF NOT EXISTS public.mari_quiz_answers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.mari_daily_quiz(id) ON DELETE CASCADE,
  choice_index int NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quiz_id)
);

GRANT SELECT, INSERT ON public.mari_quiz_answers TO authenticated;
GRANT ALL ON public.mari_quiz_answers TO service_role;
ALTER TABLE public.mari_quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quiz answers read" ON public.mari_quiz_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own quiz answers insert" ON public.mari_quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================
-- 3) Selos
-- =========================
CREATE TABLE IF NOT EXISTS public.mari_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

GRANT SELECT, INSERT ON public.mari_badges TO authenticated;
GRANT ALL ON public.mari_badges TO service_role;
ALTER TABLE public.mari_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges read" ON public.mari_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges public peek" ON public.mari_badges FOR SELECT USING (true);

-- =========================
-- 4) RPC para responder quiz
-- =========================
CREATE OR REPLACE FUNCTION public.answer_daily_quiz(p_quiz_id uuid, p_choice int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_quiz public.mari_daily_quiz%rowtype;
  v_already boolean;
  v_correct boolean;
  v_xp_gain int := 0;
  v_new_streak int := 1;
  v_last timestamptz;
  v_new_xp int;
  v_new_level text;
  v_new_badges text[] := ARRAY[]::text[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO v_quiz FROM public.mari_daily_quiz WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.mari_quiz_answers WHERE user_id = v_user AND quiz_id = p_quiz_id) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('already', true, 'correct_index', v_quiz.correct_index, 'explanation', v_quiz.explanation);
  END IF;

  v_correct := (p_choice = v_quiz.correct_index);

  INSERT INTO public.mari_quiz_answers (user_id, quiz_id, choice_index, is_correct)
  VALUES (v_user, p_quiz_id, p_choice, v_correct);

  v_xp_gain := CASE WHEN v_correct THEN 25 ELSE 5 END;

  SELECT last_activity_at INTO v_last FROM public.mari_social_xp WHERE user_id = v_user;
  IF v_last IS NOT NULL AND (now() - v_last) < interval '36 hours' AND (now() - v_last) > interval '12 hours' THEN
    v_new_streak := COALESCE((SELECT streak_days FROM public.mari_social_xp WHERE user_id = v_user), 0) + 1;
  ELSIF v_last IS NOT NULL AND (now() - v_last) <= interval '12 hours' THEN
    v_new_streak := COALESCE((SELECT streak_days FROM public.mari_social_xp WHERE user_id = v_user), 1);
  END IF;

  INSERT INTO public.mari_social_xp (user_id, xp, level, streak_days, last_activity_at, updated_at)
  VALUES (v_user, v_xp_gain, 'Bronze', v_new_streak, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET xp = public.mari_social_xp.xp + v_xp_gain,
        streak_days = v_new_streak,
        last_activity_at = now(),
        updated_at = now();

  SELECT xp INTO v_new_xp FROM public.mari_social_xp WHERE user_id = v_user;
  v_new_level := CASE
    WHEN v_new_xp >= 500 THEN 'Platina'
    WHEN v_new_xp >= 250 THEN 'Ouro'
    WHEN v_new_xp >= 100 THEN 'Prata'
    ELSE 'Bronze' END;
  UPDATE public.mari_social_xp SET level = v_new_level WHERE user_id = v_user;

  -- Selos automáticos
  IF v_correct THEN
    INSERT INTO public.mari_badges (user_id, badge_code) VALUES (v_user, 'quiz_first_correct')
      ON CONFLICT DO NOTHING RETURNING badge_code INTO v_new_badges[1];
  END IF;
  IF v_new_streak >= 7 THEN
    INSERT INTO public.mari_badges (user_id, badge_code) VALUES (v_user, 'streak_7')
      ON CONFLICT DO NOTHING;
  END IF;
  IF v_new_xp >= 100 THEN
    INSERT INTO public.mari_badges (user_id, badge_code) VALUES (v_user, 'level_prata')
      ON CONFLICT DO NOTHING;
  END IF;
  IF v_new_xp >= 250 THEN
    INSERT INTO public.mari_badges (user_id, badge_code) VALUES (v_user, 'level_ouro')
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'correct', v_correct,
    'correct_index', v_quiz.correct_index,
    'explanation', v_quiz.explanation,
    'xp_gain', v_xp_gain,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'streak', v_new_streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.answer_daily_quiz(uuid, int) TO authenticated;

-- =========================
-- 5) Seed inicial de perguntas (hoje + 6 dias)
-- =========================
INSERT INTO public.mari_daily_quiz (quiz_date, question, options, correct_index, explanation)
VALUES
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date,
   'O que significa "tornar-se sócio" de uma empresa via Mari?',
   '["Comprar produtos da empresa com desconto","Adquirir um token que representa participação econômica regulada pela CVM 88","Emprestar dinheiro com juros fixos","Ganhar pontos para trocar por brindes"]'::jsonb,
   1,
   'Pela CVM 88, o token representa participação econômica na empresa — você se torna sócio, não credor nem cliente.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1,
   'Qual é o principal objetivo do Resumo Mari numa empresa?',
   '["Recomendar compra","Explicar em 30s o que mudou, indicadores e riscos","Substituir o prospecto regulatório","Garantir retorno mínimo"]'::jsonb,
   1,
   'O Resumo Mari traduz a evolução recente em linguagem social — nunca recomenda compra nem promete retorno.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 2,
   'O que o "Score Mari" mede?',
   '["Probabilidade de lucro","Qualidade de comunicação, governança, tração e comunidade","Preço justo do token","Risco de inadimplência"]'::jsonb,
   1,
   'O Score é qualitativo: mede como a empresa se comunica e cresce, não preço nem promessa de retorno.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 3,
   'Por que a Mari mostra os bastidores da empresa, não só números?',
   '["Pra entreter","Porque relação de longo prazo nasce de entender o negócio, não só métricas","Pra esconder os riscos","Por exigência da CVM"]'::jsonb,
   1,
   'A tese é simples: investidor que acompanha a jornada é sócio mais paciente e mais bem informado.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 4,
   'O que significa "rodada aberta" numa empresa?',
   '["A empresa pagou dividendos","A empresa está captando agora e aceita novos sócios","A empresa abriu IPO na bolsa","A empresa fechou o ano fiscal"]'::jsonb,
   1,
   'Rodada aberta = janela ativa de captação primária regulada, em que novos sócios podem entrar.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 5,
   'Qual frase NUNCA aparece na Mari sobre uma empresa?',
   '["Esta empresa cresceu 40% no trimestre","Garantimos retorno de X% ao ano","O fundador publicou um diário hoje","A rodada tem meta de R$ 2 milhões"]'::jsonb,
   1,
   'Mari é proibida (e proíbe terceiros) de prometer retorno — investimento em CVM 88 é de risco.'),
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 6,
   'O que acontece com seu XP na Mari?',
   '["Vira dinheiro","Recompensa comportamento (ler, seguir, comentar) e dá selos/níveis","Conta como aporte","É vendido a terceiros"]'::jsonb,
   1,
   'XP é só reconhecimento social — recompensa aprender e participar, nunca compra.')
ON CONFLICT (quiz_date) DO NOTHING;
