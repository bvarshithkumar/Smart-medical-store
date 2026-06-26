-- =====================================================================
-- SRI VENKATESHWARA MEDICAL STORE — PRESCRIPTIONS TABLE MIGRATION
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- STEP 1: Add missing columns to prescriptions table
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS reference_id    VARCHAR(50);
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS customer_name   VARCHAR(255);
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS phone           VARCHAR(20);
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS customer_notes  TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- STEP 2: Make image_url nullable (it may not exist on old rows)
ALTER TABLE public.prescriptions ALTER COLUMN image_url DROP NOT NULL;

-- STEP 3: Enable Row Level Security (RLS)
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop old conflicting policies
DROP POLICY IF EXISTS "Enable insert for all users"    ON public.prescriptions;
DROP POLICY IF EXISTS "Enable select for tracking"     ON public.prescriptions;
DROP POLICY IF EXISTS "Enable all for admin"           ON public.prescriptions;
DROP POLICY IF EXISTS "Allow anonymous insert"         ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public select"            ON public.prescriptions;
DROP POLICY IF EXISTS "Allow all"                      ON public.prescriptions;

-- STEP 5: Create strict and secure policies
-- Allow anyone to INSERT a prescription
CREATE POLICY "anon_insert_prescriptions" ON public.prescriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to SELECT (needed for tracking)
CREATE POLICY "anon_select_prescriptions" ON public.prescriptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to update their own prescriptions
CREATE POLICY "user_update_own_prescriptions" ON public.prescriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin full access
CREATE POLICY "admin_all_prescriptions" ON public.prescriptions
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- STORAGE BUCKET: Create "prescriptions" bucket if not exists
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions',
  'prescriptions',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- STEP 6: Storage RLS policies
DROP POLICY IF EXISTS "Allow public uploads"      ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access"  ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads"        ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read"           ON storage.objects;

-- Allow anyone to upload to prescriptions bucket
CREATE POLICY "prescriptions_anon_upload" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'prescriptions');

-- Allow anyone to read from prescriptions bucket
CREATE POLICY "prescriptions_anon_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- Allow anyone to update prescriptions bucket objects
CREATE POLICY "prescriptions_anon_update" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- =====================================================================
-- REALTIME: Enable for live admin updates
-- =====================================================================
ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =====================================================================
-- PICKUP RESERVATIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pickup_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    medicines JSONB NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    qr_payload TEXT,
    receipt_url TEXT,
    collected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.pickup_reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.pickup_reservations;
DROP POLICY IF EXISTS "Enable select for everyone" ON public.pickup_reservations;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.pickup_reservations;
DROP POLICY IF EXISTS "authenticated_insert_own_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "users_select_own_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "admin_select_all_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "admin_update_all_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "user_select_own_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "user_insert_own_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "user_update_own_reservations" ON public.pickup_reservations;
DROP POLICY IF EXISTS "admin_all_reservations" ON public.pickup_reservations;

-- Create policies

-- 1. Customers can view their own reservations
CREATE POLICY "user_select_own_reservations" ON public.pickup_reservations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (prescription_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = pickup_reservations.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  );

-- 2. Customers can insert their own reservations
CREATE POLICY "user_insert_own_reservations" ON public.pickup_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (prescription_id IS NULL OR EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = pickup_reservations.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  );

-- 3. Customers can update their own reservations
CREATE POLICY "user_update_own_reservations" ON public.pickup_reservations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR (prescription_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = pickup_reservations.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (prescription_id IS NULL OR EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = pickup_reservations.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  );

-- 4. Admin full access
CREATE POLICY "admin_all_reservations" ON public.pickup_reservations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Enable Realtime
ALTER TABLE public.pickup_reservations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_reservations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =====================================================================
-- PRESCRIPTION MEDICINES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.prescription_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.prescription_medicines ENABLE ROW LEVEL SECURITY;

-- Policies for prescription_medicines
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.prescription_medicines;

-- 1. Customers can view medicines for their own prescriptions
CREATE POLICY "customer_select_own_medicines" ON public.prescription_medicines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_medicines.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));

-- 2. Admin full access
CREATE POLICY "admin_all_medicines" ON public.prescription_medicines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Enable Realtime
ALTER TABLE public.prescription_medicines REPLICA IDENTITY FULL;

-- =====================================================================
-- NOTIFICATIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Enable select and update for owners" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id OR exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')) WITH CHECK (true);

CREATE POLICY "Enable insert for everyone" ON public.notifications
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Enable Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add new tables to Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prescription_medicines;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- STEP 7: Add columns to link reservations with prescriptions and track collection timestamp
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- STEP 8: Create prescription_quotes table
CREATE TABLE IF NOT EXISTS public.prescription_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    quote_number TEXT UNIQUE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    quote_pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'Quote Generated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) for prescription_quotes
ALTER TABLE public.prescription_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for prescription_quotes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.prescription_quotes;

-- 1. Customers can view quotes for their own prescriptions
CREATE POLICY "customer_select_own_quotes" ON public.prescription_quotes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_quotes.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));

-- 2. Admin full access
CREATE POLICY "admin_all_quotes" ON public.prescription_quotes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Enable Realtime for prescription_quotes
ALTER TABLE public.prescription_quotes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prescription_quotes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- STEP 9: Create quote_change_requests table
CREATE TABLE IF NOT EXISTS public.quote_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.prescription_quotes(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    customer_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quote_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies for quote_change_requests
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.quote_change_requests;

-- 1. Customers can view/manage change requests for their own prescriptions
CREATE POLICY "customer_all_own_change_requests" ON public.quote_change_requests
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = quote_change_requests.prescription_id
      AND prescriptions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = quote_change_requests.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));

-- 2. Admin full access
CREATE POLICY "admin_all_change_requests" ON public.quote_change_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Enable Realtime
ALTER TABLE public.quote_change_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_change_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;


-- =====================================================================
-- STEP 10: Update notifications table with type, is_read, related_id columns
-- =====================================================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id TEXT;

-- Synchronize compatibility columns
UPDATE public.notifications SET is_read = read WHERE is_read IS NULL;

-- Enable Realtime for notifications in case replica identity is not FULL
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;




-- =====================================================================
-- STEP 11: Add quote versioning columns to prescription_quotes
-- =====================================================================

-- Add version_number (tracks which revision this quote is)
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Add is_active (true = this is the current/latest quote; false = superseded)
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add quote_status (text mirror of is_active: 'active' | 'superseded')
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'active';

-- Add pharmacist_notes (nullable, set when pharmacist generates the quote)
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS pharmacist_notes TEXT;

-- ── Backfill existing rows ──────────────────────────────────────────
-- Rows with status = 'Superseded' → mark as inactive / superseded
UPDATE public.prescription_quotes
SET
  is_active    = false,
  quote_status = 'superseded'
WHERE status = 'Superseded';

-- All other rows → mark as active (quote_status already defaults to 'active')
UPDATE public.prescription_quotes
SET
  is_active    = true,
  quote_status = 'active'
WHERE status != 'Superseded';

-- Assign version_number based on creation order per prescription
-- (1 for the oldest, 2 for the next, etc.)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY prescription_id
      ORDER BY created_at ASC
    ) AS rn
  FROM public.prescription_quotes
)
UPDATE public.prescription_quotes pq
SET version_number = ranked.rn
FROM ranked
WHERE pq.id = ranked.id;

-- ── RLS: existing policy already covers these new columns ──────────
-- No new policies needed; the existing "Enable all for authenticated users"
-- policy on prescription_quotes covers SELECT/INSERT/UPDATE for all columns.


-- =====================================================================
-- STEP 12: Production-Ready Customer Profiles & Quote Delivery Tracking
-- =====================================================================

-- ── 12a. Enhance profiles table ────────────────────────────────────

-- Add phone_number (alias for phone — both will be maintained for compatibility)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add customer_type: 'registered' | 'guest' | 'walk_in' | 'returning'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'registered';

-- Add email (mirror from auth.users, useful for admin views)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill phone_number from existing phone column
UPDATE public.profiles SET phone_number = phone WHERE phone_number IS NULL AND phone IS NOT NULL;

-- Backfill customer_type for all existing profiles
UPDATE public.profiles SET customer_type = 'registered' WHERE customer_type IS NULL;

-- ── 12b. Add quote delivery tracking to prescription_quotes ────────

-- Track if the quote was sent to the customer dashboard (notification)
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS sent_to_dashboard BOOLEAN DEFAULT false;

-- Track if the admin opened WhatsApp to send to this customer
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS sent_to_whatsapp BOOLEAN DEFAULT false;

-- Timestamp when the quote was sent by the admin
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Timestamp when the customer first viewed the quote on the dashboard
ALTER TABLE public.prescription_quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- ── 12c. Backfill sent_to_dashboard for quotes already in 'Quote Sent' status ──
UPDATE public.prescription_quotes
SET
  sent_to_dashboard = true,
  sent_at           = updated_at
WHERE status IN ('Quote Sent', 'Active')
  AND sent_to_dashboard IS DISTINCT FROM true;

-- ── 12d. RLS: no new policies needed ──────────────────────────────
-- Existing "Enable all for authenticated users" on prescription_quotes
-- and profiles covers all new columns.


-- =====================================================================
-- STEP 13: Add medicine_name to prescription_medicines
-- =====================================================================
-- Add the column with a temporary default so existing rows aren't rejected
-- by the NOT NULL constraint during the ALTER TABLE itself.
ALTER TABLE public.prescription_medicines
  ADD COLUMN IF NOT EXISTS medicine_name TEXT NOT NULL DEFAULT 'Unknown Medicine';

-- Backfill medicine_name from the joined products table for rows that still
-- hold the default placeholder (i.e., rows inserted before this column existed).
UPDATE public.prescription_medicines pm
SET    medicine_name = p.name
FROM   public.products p
WHERE  pm.product_id    = p.id
  AND  pm.medicine_name = 'Unknown Medicine'
  AND  p.name IS NOT NULL;

-- Drop the default so future inserts MUST supply an explicit medicine_name.
-- The NOT NULL constraint remains enforced, ensuring data integrity.
ALTER TABLE public.prescription_medicines
  ALTER COLUMN medicine_name DROP DEFAULT;
