
ALTER TABLE public.litters
  ADD COLUMN males_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN females_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.kittens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  litter_id UUID NOT NULL REFERENCES public.litters(id) ON DELETE CASCADE,
  name TEXT,
  gender TEXT,
  color TEXT,
  registration_number TEXT,
  sold BOOLEAN NOT NULL DEFAULT false,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_address TEXT,
  sale_date DATE,
  sale_price NUMERIC(10,2),
  contract_url TEXT,
  contract_file_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kittens TO authenticated;
GRANT ALL ON public.kittens TO service_role;

ALTER TABLE public.kittens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own kittens" ON public.kittens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_kittens_updated_at
  BEFORE UPDATE ON public.kittens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can manage their own kitten contracts"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'kitten-contracts' AND owner = auth.uid())
WITH CHECK (bucket_id = 'kitten-contracts' AND owner = auth.uid());
