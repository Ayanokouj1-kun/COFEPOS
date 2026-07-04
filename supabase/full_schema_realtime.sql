-- ============================================================
-- FULL SCHEMA SETUP & REALTIME REPLICATION — Mia's Café POS
-- Run this in Supabase → SQL Editor (Safe to run multiple times)
-- ============================================================

-- ── 1. Create tables ─────────────────────────────────────────

-- users table
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        NOT NULL UNIQUE,
  password     TEXT        NOT NULL,
  display_name TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'barista'
               CHECK (role IN ('superadmin', 'admin', 'barista')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- products table
CREATE TABLE IF NOT EXISTS products (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  price       NUMERIC     NOT NULL DEFAULT 0,
  cost        NUMERIC     NOT NULL DEFAULT 0,
  image       TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL DEFAULT 'Drinks & Others'
              CHECK (category IN ('Coffee', 'Pastries', 'Syrups & Retail', 'Drinks & Others')),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,   -- NULL = active
  deleted_by  TEXT        DEFAULT NULL,   -- display_name of deleting admin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- inventory table
CREATE TABLE IF NOT EXISTS inventory (
  name        TEXT        PRIMARY KEY,
  available   TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'in'
              CHECK (status IN ('in', 'low')),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  deleted_by  TEXT        DEFAULT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id        TEXT        PRIMARY KEY,
  items     JSONB       NOT NULL DEFAULT '[]',
  subtotal  NUMERIC     NOT NULL DEFAULT 0,
  tax       NUMERIC     NOT NULL DEFAULT 0,
  total     NUMERIC     NOT NULL DEFAULT 0,
  payment   TEXT        NOT NULL DEFAULT 'Cash',
  time      BIGINT      NOT NULL DEFAULT 0,
  status    TEXT        NOT NULL DEFAULT 'completed'
            CHECK (status IN ('completed', 'voided'))
);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id       TEXT        PRIMARY KEY,
  message  TEXT        NOT NULL,
  time     BIGINT      NOT NULL DEFAULT 0
);

-- deletion_audit table (permanent log of every soft-delete)
CREATE TABLE IF NOT EXISTS deletion_audit (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   TEXT        NOT NULL,   -- 'products' | 'inventory'
  record_id    TEXT        NOT NULL,   -- pk of the deleted row
  record_name  TEXT        NOT NULL,   -- human-readable label
  deleted_by   TEXT        NOT NULL,   -- display_name of the actor
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot     JSONB       NOT NULL DEFAULT '{}'  -- full row at deletion time
);

-- ── 2. Create indexes ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_deletion_audit_table   ON deletion_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted ON deletion_audit(deleted_at DESC);

-- ── 3. Seed default superadmin account ───────────────────────

INSERT INTO users (username, password, display_name, role)
VALUES ('admin', 'admin123', 'Admin', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- ── 4. Enable Supabase Realtime Replication ──────────────────

-- Set replica identity to FULL for tracking detailed updates & deletes
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Safely add tables to Supabase Realtime publication
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['products', 'inventory', 'transactions', 'notifications'];
BEGIN
  -- Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
