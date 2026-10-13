
CREATE POLICY "user owns cat-photos" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'cat-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'cat-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "user owns health-docs" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'health-docs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'health-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
