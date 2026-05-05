DROP POLICY IF EXISTS "Authenticated users can list bake photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;

-- bake-photos: owner-scoped listing only
CREATE POLICY "Users can list their own bake photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bake-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- branding: admin-only listing
CREATE POLICY "Admins can list branding assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'branding'
  AND has_role(auth.uid(), 'admin'::app_role)
);