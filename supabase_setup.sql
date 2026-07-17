-- ═══════════════════════════════════════════════════════════════
-- DYNAMIC MENU CATEGORY SYSTEM
-- Run this in Supabase SQL Editor to create tables, seed data,
-- and migrate existing products.
-- ═══════════════════════════════════════════════════════════════

-- ── Menu Categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  supports_syrup BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_name_active_idx
  ON menu_categories (LOWER(name))
  WHERE deleted_at IS NULL;

-- ── Category Variants ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_variants (
  id          TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS category_variants_name_per_cat_idx
  ON category_variants (category_id, LOWER(name))
  WHERE deleted_at IS NULL;

-- ── Syrups ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syrups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS syrups_name_active_idx
  ON syrups (LOWER(name))
  WHERE deleted_at IS NULL;

-- ── Products: add category_id + variant_prices ────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES menu_categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_prices JSONB DEFAULT NULL;

-- Drop old category CHECK constraint (legacy Hot/Cold/Waffles/Flavors)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- ═══════════════════════════════════════════════════════════════
-- SEED CATEGORIES (idempotent)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO menu_categories (id, name, sort_order, supports_syrup) VALUES
  ('coffee',              'COFFEE',              1,  true),
  ('traditional-ice-tea', 'TRADITIONAL ICE TEA', 2,  false),
  ('protein-lemonade',    'PROTEIN LEMONADE',    3,  false),
  ('thick-frappe',        'THICK FRAPPE',        4,  false),
  ('fresh-blended',       'FRESH BLENDED',       5,  false),
  ('bubble-milktea',      'BUBBLE MILKTEA',      6,  false),
  ('non-coffee',          'NON-COFFEE',          7,  false),
  ('ice-coffee',          'ICE COFFEE',          8,  false),
  ('matcha',              'MATCHA',              9,  false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  supports_syrup = EXCLUDED.supports_syrup;

-- ═══════════════════════════════════════════════════════════════
-- SEED VARIANTS (idempotent)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO category_variants (id, category_id, name, sort_order) VALUES
  ('coffee-hot',      'coffee', 'Hot',      1),
  ('coffee-iced',     'coffee', 'Iced',     2),
  ('coffee-freezer',  'coffee', 'Freezer',  3),
  ('coffee-thick',    'coffee', 'Thick',    4),

  ('tie-hot',  'traditional-ice-tea', 'Hot',  1),
  ('tie-iced', 'traditional-ice-tea', 'Iced', 2),

  ('tf-coffee-base', 'thick-frappe', 'Coffee Base', 1),
  ('tf-cream-base',  'thick-frappe', 'Cream Base',  2),

  ('bmt-shaken',  'bubble-milktea', 'Shaken',  1),
  ('bmt-blended', 'bubble-milktea', 'Blended', 2),

  ('nc-hot',     'non-coffee', 'Hot',     1),
  ('nc-iced',    'non-coffee', 'Iced',    2),
  ('nc-freezer', 'non-coffee', 'Freezer', 3),
  ('nc-thick',   'non-coffee', 'Thick',   4),

  ('matcha-hot',     'matcha', 'Hot',     1),
  ('matcha-iced',    'matcha', 'Iced',    2),
  ('matcha-freezer', 'matcha', 'Freezer', 3),
  ('matcha-thick',   'matcha', 'Thick',   4)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATE EXISTING PRODUCTS
-- ═══════════════════════════════════════════════════════════════

-- Map legacy category text → new category_id
UPDATE products SET category_id = 'coffee'
WHERE category_id IS NULL AND category IN ('Hot', 'Cold', 'Coffee', 'Flavors', 'Syrups & Retail', 'Syrups', 'Flavor', 'Flavour');

UPDATE products SET category_id = 'non-coffee'
WHERE category_id IS NULL AND category IN ('Waffles', 'Pastries', 'Drinks & Others');

-- Keyword-based fallback for anything still null
UPDATE products SET category_id = 'matcha'
WHERE category_id IS NULL AND LOWER(name) LIKE '%matcha%';

UPDATE products SET category_id = 'bubble-milktea'
WHERE category_id IS NULL AND (LOWER(name) LIKE '%milktea%' OR LOWER(name) LIKE '%milk tea%' OR LOWER(name) LIKE '%bubble%');

UPDATE products SET category_id = 'protein-lemonade'
WHERE category_id IS NULL AND LOWER(name) LIKE '%lemonade%';

UPDATE products SET category_id = 'thick-frappe'
WHERE category_id IS NULL AND (LOWER(name) LIKE '%frappe%' OR LOWER(name) LIKE '%frappé%');

UPDATE products SET category_id = 'traditional-ice-tea'
WHERE category_id IS NULL AND (LOWER(name) LIKE '%ice tea%' OR LOWER(name) LIKE '%iced tea%');

UPDATE products SET category_id = 'ice-coffee'
WHERE category_id IS NULL AND (LOWER(name) LIKE '%ice coffee%' OR LOWER(name) LIKE '%iced coffee%');

UPDATE products SET category_id = 'fresh-blended'
WHERE category_id IS NULL AND LOWER(name) LIKE '%blended%';

UPDATE products SET category_id = 'non-coffee'
WHERE category_id IS NULL AND (LOWER(name) LIKE '%waffle%' OR LOWER(name) LIKE '%chocolate%');

-- Default remaining to coffee
UPDATE products SET category_id = 'coffee' WHERE category_id IS NULL;

-- Sync category display name from new category_id
UPDATE products p
SET category = mc.name
FROM menu_categories mc
WHERE p.category_id = mc.id;

-- Migrate size_prices → variant_prices (use base product price for each variant)
UPDATE products p
SET variant_prices = (
  SELECT jsonb_object_agg(cv.id, p.price::numeric)
  FROM category_variants cv
  WHERE cv.category_id = p.category_id AND cv.deleted_at IS NULL
)
WHERE p.variant_prices IS NULL
  AND EXISTS (
    SELECT 1 FROM category_variants cv
    WHERE cv.category_id = p.category_id AND cv.deleted_at IS NULL
  );

-- Migrate Flavors products → syrups table
INSERT INTO syrups (id, name, enabled, sort_order)
SELECT
  LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')),
  name,
  true,
  ROW_NUMBER() OVER (ORDER BY name)
FROM products
WHERE category IN ('Flavors', 'Syrups & Retail', 'Syrups', 'Flavor', 'Flavour')
  AND deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- Soft-delete migrated flavor/syrup retail products (now managed in Syrup Dashboard)
UPDATE products
SET deleted_at = NOW(), deleted_by = 'migration'
WHERE category IN ('Flavors', 'Syrups & Retail', 'Syrups', 'Flavor', 'Flavour')
  AND deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- STORAGE (unchanged — keep for reference)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access to product-images" ON storage.objects;
CREATE POLICY "Allow public read access to product-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow public to upload to product-images" ON storage.objects;
CREATE POLICY "Allow public to upload to product-images"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow public to update to product-images" ON storage.objects;
CREATE POLICY "Allow public to update to product-images"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow public to delete to product-images" ON storage.objects;
CREATE POLICY "Allow public to delete to product-images"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'product-images');

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access to inventory-images" ON storage.objects;
CREATE POLICY "Allow public read access to inventory-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Allow public to upload to inventory-images" ON storage.objects;
CREATE POLICY "Allow public to upload to inventory-images"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Allow public to update to inventory-images" ON storage.objects;
CREATE POLICY "Allow public to update to inventory-images"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Allow public to delete to inventory-images" ON storage.objects;
CREATE POLICY "Allow public to delete to inventory-images"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'inventory-images');

UPDATE users SET display_name = 'Barista' WHERE username = 'barista';

-- ═══════════════════════════════════════════════════════════════
-- SYRUP PRICES, COFFEE SIZE PRICES, SENIOR DISCOUNT SETTINGS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE syrups ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0;
UPDATE syrups SET price = 0 WHERE price IS NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS size_prices JSONB DEFAULT NULL;

-- Seed coffee hot/iced size prices from base price where missing
UPDATE products p
SET size_prices = jsonb_build_object(
  'coffee-hot', jsonb_build_object(
    '8oz',  round((p.price::numeric * 0.85)::numeric, 2),
    '12oz', round(p.price::numeric, 2),
    '16oz', round((p.price::numeric * 1.25)::numeric, 2)
  ),
  'coffee-iced', jsonb_build_object(
    '12oz', round(p.price::numeric, 2),
    '16oz', round((p.price::numeric * 1.25)::numeric, 2)
  )
)
WHERE p.category_id = 'coffee'
  AND (p.size_prices IS NULL OR p.size_prices = '{}'::jsonb);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('senior_discount_percent', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS senior_discount BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT NULL;
