-- Create storage bucket for app branding assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Allow admins to upload branding assets
CREATE POLICY "Admins can upload branding assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update branding assets
CREATE POLICY "Admins can update branding assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete branding assets
CREATE POLICY "Admins can delete branding assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access to branding assets
CREATE POLICY "Anyone can view branding assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branding');