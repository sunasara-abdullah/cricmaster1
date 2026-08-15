CREATE TABLE public.global_players (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  matches INTEGER NOT NULL DEFAULT 0,
  batting JSONB NOT NULL DEFAULT '{}'::jsonb,
  bowling JSONB NOT NULL DEFAULT '{}'::jsonb,
  photo TEXT,
  last_played TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX global_players_slug_idx ON public.global_players (slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_players TO authenticated;
GRANT ALL ON public.global_players TO service_role;

ALTER TABLE public.global_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view all players"
  ON public.global_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own player records"
  ON public.global_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player records"
  ON public.global_players FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own player records"
  ON public.global_players FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_global_players_updated_at
  BEFORE UPDATE ON public.global_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();