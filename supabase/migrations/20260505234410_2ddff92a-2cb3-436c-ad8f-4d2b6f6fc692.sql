-- Restrict SELECT (listing) on public storage buckets to authenticated users only.
-- Public file URLs still work via the storage public render endpoint.

DROP POLICY IF EXISTS "Anyone can view bake photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view branding assets" ON storage.objects;

CREATE POLICY "Authenticated users can list bake photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bake-photos');

CREATE POLICY "Authenticated users can list branding assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'branding');