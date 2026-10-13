
-- Cats
CREATE TABLE public.cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('Stud','Queen','Alter')),
  dob DATE,
  registration_number TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cats TO authenticated;
GRANT ALL ON public.cats TO service_role;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cats" ON public.cats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Matings
CREATE TABLE public.matings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queen_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  stud_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  mating_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matings TO authenticated;
GRANT ALL ON public.matings TO service_role;
ALTER TABLE public.matings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matings" ON public.matings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Litters
CREATE TABLE public.litters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mating_id UUID REFERENCES public.matings(id) ON DELETE SET NULL,
  queen_id UUID REFERENCES public.cats(id) ON DELETE SET NULL,
  stud_id UUID REFERENCES public.cats(id) ON DELETE SET NULL,
  dob DATE NOT NULL,
  kitten_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.litters TO authenticated;
GRANT ALL ON public.litters TO service_role;
ALTER TABLE public.litters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own litters" ON public.litters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Health Records
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('HCM Echo','Hip Dysplasia','DNA Panel','Other')),
  title TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  test_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health records" ON public.health_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX cats_user_idx ON public.cats(user_id);
CREATE INDEX matings_user_idx ON public.matings(user_id);
CREATE INDEX litters_user_idx ON public.litters(user_id);
CREATE INDEX health_cat_idx ON public.health_records(cat_id);
