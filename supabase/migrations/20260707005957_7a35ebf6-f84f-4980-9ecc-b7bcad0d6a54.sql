-- Storage policies for course-media bucket
DROP POLICY IF EXISTS "Signed-in users read course-media" ON storage.objects;
CREATE POLICY "Signed-in users read course-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-media');

DROP POLICY IF EXISTS "Admins insert course-media" ON storage.objects;
CREATE POLICY "Admins insert course-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update course-media" ON storage.objects;
CREATE POLICY "Admins update course-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete course-media" ON storage.objects;
CREATE POLICY "Admins delete course-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'));