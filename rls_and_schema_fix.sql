-- =====================================================================
-- SRI VENKATESHWARA MEDICAL STORE — SYSTEM MIGRATION & RLS SECURITY AUDIT
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. DATABASE SCHEMA UPGRADES ──────────────────────────────────────

-- Ensure columns exist in pickup_reservations
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.prescription_quotes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT false
);

-- Create chat_messages table if not exists
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT,
    message TEXT,
    image_url TEXT,
    sender_role TEXT NOT NULL, -- 'customer' | 'pharmacist'
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ── 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES ─────────────────
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ── 3. DROP OLD POLICIES TO PREVENT CONFLICTS ──────────────────────

-- prescriptions
DROP POLICY IF EXISTS "anon_insert_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "anon_select_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "user_update_own_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "authenticated_all_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "admin_all_prescriptions" ON public.prescriptions;

-- prescription_quotes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.prescription_quotes;
DROP POLICY IF EXISTS "customer_select_own_quotes" ON public.prescription_quotes;
DROP POLICY IF EXISTS "admin_all_quotes" ON public.prescription_quotes;

-- quote_change_requests
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.quote_change_requests;
DROP POLICY IF EXISTS "customer_all_own_change_requests" ON public.quote_change_requests;
DROP POLICY IF EXISTS "admin_all_change_requests" ON public.quote_change_requests;

-- prescription_medicines
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.prescription_medicines;
DROP POLICY IF EXISTS "customer_select_own_medicines" ON public.prescription_medicines;
DROP POLICY IF EXISTS "admin_all_medicines" ON public.prescription_medicines;

-- pickup_reservations
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

-- notifications
DROP POLICY IF EXISTS "Enable select and update for owners" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.notifications;
DROP POLICY IF EXISTS "select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "customer_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_notifications" ON public.notifications;

-- chat_messages
DROP POLICY IF EXISTS "chat_all_authenticated" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "customer_chats" ON public.chat_messages;
DROP POLICY IF EXISTS "admin_chats" ON public.chat_messages;

-- storage policies
DROP POLICY IF EXISTS "prescriptions_anon_upload" ON storage.objects;
DROP POLICY IF EXISTS "prescriptions_anon_read" ON storage.objects;
DROP POLICY IF EXISTS "prescriptions_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read" ON storage.objects;
DROP POLICY IF EXISTS "admin_prescriptions_all" ON storage.objects;
DROP POLICY IF EXISTS "customer_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "anon_upload_prescriptions" ON storage.objects;
DROP POLICY IF EXISTS "customer_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "customer_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "customer_delete_policy" ON storage.objects;


-- ── 4. CREATE DATABASE RLS POLICIES ──────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- prescriptions POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_prescriptions" ON public.prescriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "anon_select_prescriptions" ON public.prescriptions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "anon_insert_prescriptions" ON public.prescriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "user_update_own_prescriptions" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ─────────────────────────────────────────────────────────────────────
-- prescription_quotes POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_quotes" ON public.prescription_quotes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "customer_select_own_quotes" ON public.prescription_quotes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_quotes.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));


-- ─────────────────────────────────────────────────────────────────────
-- quote_change_requests POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_change_requests" ON public.quote_change_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

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


-- ─────────────────────────────────────────────────────────────────────
-- prescription_medicines POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_medicines" ON public.prescription_medicines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "customer_select_own_medicines" ON public.prescription_medicines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_medicines.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));


-- ─────────────────────────────────────────────────────────────────────
-- pickup_reservations POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_reservations" ON public.pickup_reservations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

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


-- ─────────────────────────────────────────────────────────────────────
-- notifications POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "insert_notifications" ON public.notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "customer_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ─────────────────────────────────────────────────────────────────────
-- chat_messages POLICIES
-- ─────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_chats" ON public.chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "customer_chats" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (prescription_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = chat_messages.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (prescription_id IS NULL OR EXISTS (
      SELECT 1 FROM public.prescriptions
      WHERE prescriptions.id = chat_messages.prescription_id
        AND prescriptions.user_id = auth.uid()
    ))
  );

CREATE POLICY "chat_select_anon" ON public.chat_messages
  FOR SELECT TO anon
  USING (prescription_id IS NOT NULL);

CREATE POLICY "chat_insert_anon" ON public.chat_messages
  FOR INSERT TO anon
  WITH CHECK (prescription_id IS NOT NULL);


-- ── 5. CREATE STORAGE RLS POLICIES ───────────────────────────────────

-- Admin full read/write access to everything in 'prescriptions' bucket
CREATE POLICY "admin_prescriptions_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Customer upload restrictions (INSERT)
-- Authenticated customers can only upload reservation PDFs into 'reservations/'
-- or their own prescription files into root (prefixed with 'rx_<user_id>_')
CREATE POLICY "customer_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND (
      name LIKE 'reservations/%'
      OR name LIKE 'rx_' || auth.uid()::text || '_%'
    )
  );

-- Anon upload restrictions (INSERT)
-- Guest users can upload prescriptions to the root bucket (prefixed with 'rx_')
CREATE POLICY "anon_upload_prescriptions" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND name LIKE 'rx_%'
  );

-- Customer read access (SELECT)
-- Authenticated customers can read their own uploaded files (reservations/prescriptions)
-- and quotes generated by administrators.
CREATE POLICY "customer_read_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND (
      auth.uid() = owner
      OR name LIKE 'quotes/%'
    )
  );

-- Anon read access (SELECT)
-- Guest users can only read prescription files (for tracking purposes),
-- but have absolutely no access to reservations or quotes.
CREATE POLICY "anon_read_policy" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'prescriptions'
    AND name LIKE 'rx_%'
  );

-- Customer update access (UPDATE)
-- Customers can only modify files they own
CREATE POLICY "customer_update_policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND auth.uid() = owner
  )
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND auth.uid() = owner
  );

-- Customer delete access (DELETE)
-- Customers can only delete files they own
CREATE POLICY "customer_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND auth.uid() = owner
  );


-- ── 6. REALTIME ENABLEMENT ──────────────────────────────────────────
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ── 7. RELOAD SCHEMA CACHE ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
