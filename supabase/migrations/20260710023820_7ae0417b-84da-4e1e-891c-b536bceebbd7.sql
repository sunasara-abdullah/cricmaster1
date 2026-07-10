CREATE TABLE public.user_app_data (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_data TO authenticated;
GRANT ALL ON public.user_app_data TO service_role;

ALTER TABLE public.user_app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own app data"
  ON public.user_app_data FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_app_data_updated_at
  BEFORE UPDATE ON public.user_app_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();