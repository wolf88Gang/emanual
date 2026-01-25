-- Create storage bucket for asset photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-photos', 'asset-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for asset photos storage
CREATE POLICY "Anyone can view asset photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-photos');

CREATE POLICY "Authenticated users can upload asset photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'asset-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete asset photos they uploaded"
ON storage.objects FOR DELETE
USING (bucket_id = 'asset-photos' AND auth.role() = 'authenticated');