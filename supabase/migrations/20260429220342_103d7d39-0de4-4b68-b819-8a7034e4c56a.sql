-- Threads
CREATE TABLE public.mari_brain_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mari_brain_threads_user ON public.mari_brain_threads(user_id, updated_at DESC);

ALTER TABLE public.mari_brain_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mari threads"
  ON public.mari_brain_threads
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all mari threads"
  ON public.mari_brain_threads
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages
CREATE TABLE public.mari_brain_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.mari_brain_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mari_brain_messages_thread ON public.mari_brain_messages(thread_id, created_at);

ALTER TABLE public.mari_brain_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mari messages"
  ON public.mari_brain_messages
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all mari messages"
  ON public.mari_brain_messages
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_mari_brain_threads_updated_at
  BEFORE UPDATE ON public.mari_brain_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();