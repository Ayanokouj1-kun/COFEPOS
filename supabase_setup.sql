-- Ensure image column exists in products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;

-- Create product-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the product-images bucket on storage.objects.
-- Note: Since the application uses a custom user table and session management
-- instead of Supabase Auth, API requests to Supabase are treated as public/anon.
-- Therefore, policies are set to 'public' to permit access correctly.

-- Allow public read access to product-images
DROP POLICY IF EXISTS "Allow public read access to product-images" ON storage.objects;
CREATE POLICY "Allow public read access to product-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow public/anon to upload to product-images
DROP POLICY IF EXISTS "Allow public to upload to product-images" ON storage.objects;
CREATE POLICY "Allow public to upload to product-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- Allow public/anon to update product-images
DROP POLICY IF EXISTS "Allow public to update product-images" ON storage.objects;
CREATE POLICY "Allow public to update product-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-images');

-- Allow public/anon to delete product-images
DROP POLICY IF EXISTS "Allow public to delete product-images" ON storage.objects;
CREATE POLICY "Allow public to delete product-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-images');

-- ═══════════════════════════════════════════════════════════════
-- INVENTORY IMAGES
-- ═══════════════════════════════════════════════════════════════

-- Ensure image column exists in inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;

-- Create inventory-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to inventory-images
DROP POLICY IF EXISTS "Allow public read access to inventory-images" ON storage.objects;
CREATE POLICY "Allow public read access to inventory-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inventory-images');

-- Allow public/anon to upload to inventory-images
DROP POLICY IF EXISTS "Allow public to upload to inventory-images" ON storage.objects;
CREATE POLICY "Allow public to upload to inventory-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'inventory-images');

-- Allow public/anon to update inventory-images
DROP POLICY IF EXISTS "Allow public to update inventory-images" ON storage.objects;
CREATE POLICY "Allow public to update inventory-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'inventory-images');

-- Allow public/anon to delete inventory-images
DROP POLICY IF EXISTS "Allow public to delete inventory-images" ON storage.objects;
CREATE POLICY "Allow public to delete inventory-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'inventory-images');
