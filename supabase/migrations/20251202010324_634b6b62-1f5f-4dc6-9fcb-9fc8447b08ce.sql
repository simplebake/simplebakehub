-- Add server-side restrictions to bake-photos bucket
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'bake-photos';

-- Add storage RLS policies for bake-photos bucket
CREATE POLICY "Authenticated users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bake-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bake-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view all photos in bake-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'bake-photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bake-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);