ALTER TABLE public.global_players
  ADD COLUMN IF NOT EXISTS teams text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS leagues text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seasons text[] NOT NULL DEFAULT '{}';