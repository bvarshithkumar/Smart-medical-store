-- =====================================================================
-- STEP 5: CREATE/UPGRADE NOTIFICATIONS TABLE
-- Run this script in the Supabase SQL Editor.
-- =====================================================================

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
    read BOOLEAN NOT NULL DEFAULT false -- maintained for backward compatibility
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Enable select and update for owners" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.notifications;
DROP POLICY IF EXISTS "select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_notifications" ON public.notifications;

-- Create new policies
-- Admin full access
CREATE POLICY "admin_notifications" ON public.notifications
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Anyone can insert notifications (to support client-side notification triggers)
CREATE POLICY "insert_notifications" ON public.notifications
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      auth.uid() = user_id 
      OR user_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      )
    );

-- Customers can view/update their own notifications
CREATE POLICY "customer_notifications" ON public.notifications
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Enable Realtime for notifications table
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
