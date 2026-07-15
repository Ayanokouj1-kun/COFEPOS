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

-- ═══════════════════════════════════════════════════════════════
-- DATA UPDATES
-- ═══════════════════════════════════════════════════════════════

-- Rename display name of barista role to "Barista"
UPDATE users SET display_name = 'Barista' WHERE username = 'barista';

-- ═══════════════════════════════════════════════════════════════
-- PRODUCT CATEGORIES → Hot / Cold / Waffles / Flavors
-- IMPORTANT: drop the old CHECK first, then remap, then re-add.
-- ═══════════════════════════════════════════════════════════════

-- 1) Drop every category CHECK on products (name can vary)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- 2) Remap legacy → new categories
UPDATE products SET category = 'Hot'     WHERE category IN ('Coffee');
UPDATE products SET category = 'Waffles' WHERE category IN ('Pastries', 'Waffle');
UPDATE products SET category = 'Flavors' WHERE category IN ('Syrups & Retail', 'Syrups', 'Flavor', 'Flavour');
UPDATE products SET category = 'Cold'    WHERE category IN ('Drinks & Others');

-- Catch anything still outside the new set (null / typos / partial runs)
UPDATE products
SET category = 'Hot'
WHERE category IS NULL
   OR category NOT IN ('Hot', 'Cold', 'Waffles', 'Flavors');

-- 3) Enforce the new allowed values
ALTER TABLE products
  ADD CONSTRAINT products_category_check
  CHECK (category IN ('Hot', 'Cold', 'Waffles', 'Flavors'));

-- ═══════════════════════════════════════════════════════════════
-- PER-SIZE PRICES (Hot / Cold oz options)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_prices JSONB DEFAULT NULL;

-- Seed size prices from base price when missing (Hot: 8/12/16, Cold: 12/16)
UPDATE products
SET size_prices = jsonb_build_object(
  '8oz',  round((price::numeric * 0.85)::numeric, 2),
  '12oz', round(price::numeric, 2),
  '16oz', round((price::numeric * 1.25)::numeric, 2)
)
WHERE category = 'Hot'
  AND (size_prices IS NULL OR size_prices = '{}'::jsonb);

UPDATE products
SET size_prices = jsonb_build_object(
  '12oz', round(price::numeric, 2),
  '16oz', round((price::numeric * 1.25)::numeric, 2)
)
WHERE category = 'Cold'
  AND (size_prices IS NULL OR size_prices = '{}'::jsonb);

