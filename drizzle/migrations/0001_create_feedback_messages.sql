CREATE TABLE public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL DEFAULT 'Support',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  emailed boolean NOT NULL DEFAULT false
);

GRANT INSERT ON public.feedback_messages TO anon, authenticated;
GRANT ALL ON public.feedback_messages TO service_role;

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit feedback"
  ON public.feedback_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 60
    AND char_length(email) BETWEEN 3 AND 255
    AND char_length(message) BETWEEN 10 AND 1000
  );
-- No SELECT policy: only the backend (service role) can read feedback.