ALTER TABLE public.profiles ADD COLUMN logo_url TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Storage policy for cattery-logos bucket
CREATE POLICY "Users can manage their own cattery logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'cattery-logos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'cattery-logos' AND owner = auth.uid());