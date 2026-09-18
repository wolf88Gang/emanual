DROP POLICY IF EXISTS "Anyone can view asset photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;

CREATE POLICY "Signed-in users can view asset photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'asset-photos');

CREATE POLICY "Signed-in users can view evidence photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos');