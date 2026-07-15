-- Live match snapshots for the "Live Share" feature.
-- Anyone with the share id can read (public spectator link);
-- only the owning scorer can write.

CREATE TABLE public.live_matches (
  id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_matches TO authenticated;
GRANT ALL ON public.live_matches TO service_role;

ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;

-- Anyone (even signed-out spectators) can read a live match by id.
CREATE POLICY "Anyone can view a live match"
  ON public.live_matches FOR SELECT
  USING (true);

-- Only the scoring user can create/update/delete their own live match.
CREATE POLICY "Owner can insert their live match"
  ON public.live_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update their live match"
  ON public.live_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete their live match"
  ON public.live_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_live_matches_updated_at
  BEFORE UPDATE ON public.live_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so spectators get pushed updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_matches;