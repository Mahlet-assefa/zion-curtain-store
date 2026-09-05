CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure curtains table aligns strictly with the requested feature set
CREATE TABLE IF NOT EXISTS curtains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_color TEXT,
  price_per_meter NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration block to update existing legacy table structure safely
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='sku') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='item_code') THEN
    ALTER TABLE curtains RENAME COLUMN sku TO item_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='color') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='item_color') THEN
    ALTER TABLE curtains RENAME COLUMN color TO item_color;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='unit_price') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='price_per_meter') THEN
    ALTER TABLE curtains RENAME COLUMN unit_price TO price_per_meter;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='quantity') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='stock_amount') THEN
    ALTER TABLE curtains RENAME COLUMN quantity TO stock_amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='image_url') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='item_image') THEN
    ALTER TABLE curtains RENAME COLUMN image_url TO item_image;
  END IF;

  -- Drop legacy NOT NULL constraints
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='name') THEN
    ALTER TABLE curtains ALTER COLUMN name DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='curtains' AND column_name='category') THEN
    ALTER TABLE curtains ALTER COLUMN category DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE curtains ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE curtains ADD COLUMN IF NOT EXISTS item_color TEXT;
ALTER TABLE curtains ADD COLUMN IF NOT EXISTS price_per_meter NUMERIC(12,2) DEFAULT 0;
ALTER TABLE curtains ADD COLUMN IF NOT EXISTS stock_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE curtains ADD COLUMN IF NOT EXISTS item_image TEXT;
ALTER TABLE curtains ADD COLUMN IF NOT EXISTS purchase_price_per_meter NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Convert existing columns to NUMERIC type for meters and decimals
ALTER TABLE curtains ALTER COLUMN stock_amount TYPE NUMERIC(10,2) USING stock_amount::numeric;
ALTER TABLE curtains ALTER COLUMN price_per_meter TYPE NUMERIC(12,2) USING price_per_meter::numeric;

CREATE TABLE IF NOT EXISTS curtain_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curtain_id UUID REFERENCES curtains(id) ON DELETE CASCADE,
  length_meters NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curtain_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curtain_id UUID REFERENCES curtains(id) ON DELETE CASCADE,
  meters_sold NUMERIC(10,2) NOT NULL,
  price_per_meter NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE curtain_sales ADD COLUMN IF NOT EXISTS purchase_price_per_meter NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  item_description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','overdue','paid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS curtains_code_idx ON curtains(item_code);
CREATE INDEX IF NOT EXISTS curtain_stock_curtain_idx ON curtain_stock_items(curtain_id);
CREATE INDEX IF NOT EXISTS curtain_sales_curtain_idx ON curtain_sales(curtain_id);
CREATE INDEX IF NOT EXISTS debits_status_idx ON debits(status);
CREATE INDEX IF NOT EXISTS ledger_date_idx ON ledger_entries(entry_date);
