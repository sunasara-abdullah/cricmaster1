-- Owners only can read the raw table (hides user_id from the public)
DROP POLICY IF EXISTS "Anyone can view live matches" ON public.live_matches;
DROP POLICY IF EXISTS "Public can view live matches" ON public.live_matches;
DROP POLICY IF EXISTS "live_matches_select_public" ON public.live_matches;

CREATE POLICY "Owners can view their live matches"
ON public.live_matches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE SELECT ON public.live_matches FROM anon;

-- Public sharing: only the snapshot for a specific match id, no user_id
CREATE OR REPLACE FUNCTION public.get_live_match(_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT snapshot FROM public.live_matches WHERE id::text = _id
$$;

GRANT EXECUTE ON FUNCTION public.get_live_match(text) TO anon, authenticated;