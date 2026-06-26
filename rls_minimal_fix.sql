-- =====================================================================
-- SRI VENKATESHWARA MEDICAL STORE — MINIMAL SCHEMA & STORAGE RLS FIX
-- Run this script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. DATABASE SCHEMA UPGRADES ──────────────────────────────────────

-- Ensure columns exist in pickup_reservations
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
ALTER TABLE public.pickup_reservations ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- Create notifications table if not exists (required for order notifications)
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

-- Create chat_messages table if not exists (required for pharmacist-customer chat)
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

-- Enable RLS on notifications and chat_messages
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ── 2. PICKUP RESERVATIONS RLS POLICIES (MINIMAL) ────────────────────

ALTER TABLE public.pickup_reservations ENABLE ROW LEVEL SECURITY;

-- Drop old pickup_reservations policies to prevent conflicts
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

-- 4. Admin full access to pickup_reservations
CREATE POLICY "admin_all_reservations" ON public.pickup_reservations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── 3. NOTIFICATIONS & CHAT MESSAGES POLICIES (MINIMAL) ──────────────

-- Drop old policies to prevent conflicts
DROP POLICY IF EXISTS "customer_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "customer_chats" ON public.chat_messages;
DROP POLICY IF EXISTS "admin_chats" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_anon" ON public.chat_messages;

-- Notifications
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

-- Chat Messages
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

CREATE POLICY "chat_select_anon" ON public.chat_messages FOR SELECT TO anon USING (prescription_id IS NOT NULL);
CREATE POLICY "chat_insert_anon" ON public.chat_messages FOR INSERT TO anon WITH CHECK (prescription_id IS NOT NULL);


-- ── 4. STORAGE RLS POLICIES FOR PRESCRIPTIONS BUCKET (MINIMAL) ───────

-- Drop old storage policies for the prescriptions bucket to prevent conflicts
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

-- 1. Admin full access to everything in 'prescriptions' bucket
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

-- 2. Customer upload restrictions (INSERT)
-- Authenticated customers can upload reservation PDFs into 'reservations/'
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

-- 3. Anon upload restrictions (INSERT)
-- Guest users can upload prescriptions to root (prefixed with 'rx_')
CREATE POLICY "anon_upload_prescriptions" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'prescriptions'
    AND name LIKE 'rx_%'
  );

-- 4. Customer read access (SELECT)
-- Authenticated customers can read their own files (reservations/prescriptions) and quotes
CREATE POLICY "customer_read_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND (
      auth.uid() = owner
      OR name LIKE 'quotes/%'
    )
  );

-- 5. Anon read access (SELECT)
-- Guest users can read prescription files for tracking, but not reservations or quotes
CREATE POLICY "anon_read_policy" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'prescriptions'
    AND name LIKE 'rx_%'
  );

-- 6. Customer update/delete access (UPDATE/DELETE)
-- Customers can only manage files they own
CREATE POLICY "customer_update_policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'prescriptions' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'prescriptions' AND auth.uid() = owner);

CREATE POLICY "customer_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'prescriptions' AND auth.uid() = owner);

-- ── 5. REALTIME & CACHE RELOAD ───────────────────────────────────────
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';
