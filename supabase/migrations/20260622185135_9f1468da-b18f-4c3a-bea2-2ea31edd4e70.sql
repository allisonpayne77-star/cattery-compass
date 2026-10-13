ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS breed text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS multiple_breeds boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;