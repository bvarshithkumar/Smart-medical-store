-- ─────────────────────────────────────────────────────────────────────
-- INVENTORY MANAGEMENT INTEGRATION SCHEMA
-- Run this script in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────

-- 1. Add inventory tracking columns to the public.products table if they do not exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_level    INTEGER DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier         VARCHAR(255) DEFAULT 'Venkateshwara Wholesalers';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_no         VARCHAR(50) DEFAULT 'B-GEN999';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mfg_date         DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days');
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expiry_date      DATE DEFAULT (CURRENT_DATE + INTERVAL '180 days');
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_updated     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Backfill existing products with default values if they are null
UPDATE public.products SET reorder_level = 10 WHERE reorder_level IS NULL;
UPDATE public.products SET supplier = 'Venkateshwara Wholesalers' WHERE supplier IS NULL;
UPDATE public.products SET batch_no = 'B-' || UPPER(SUBSTRING(name FROM 1 FOR 3)) || '101' WHERE batch_no IS NULL;
UPDATE public.products SET mfg_date = (CURRENT_DATE - INTERVAL '45 days') WHERE mfg_date IS NULL;
UPDATE public.products SET expiry_date = (CURRENT_DATE + INTERVAL '240 days') WHERE expiry_date IS NULL;

-- 2. Create the public.inventory_logs table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    action TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    username TEXT NOT NULL,
    reason TEXT,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on inventory_logs
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for public.inventory_logs
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.inventory_logs;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON public.inventory_logs;
DROP POLICY IF EXISTS "admin_all_logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "customer_select_own_logs" ON public.inventory_logs;

-- Allow admins full access to logs
CREATE POLICY "admin_all_logs" ON public.inventory_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow customers/anonymous requests to insert logs (needed during checkout/reservation confirmation)
CREATE POLICY "customer_insert_logs" ON public.inventory_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "authenticated_select_logs" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (true);

-- 4. Enable Realtime Replication for inventory logs and products
ALTER TABLE public.inventory_logs REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_logs;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
