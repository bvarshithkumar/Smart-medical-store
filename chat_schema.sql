-- =====================================================================
-- STEP 1: CREATE CHAT MESSAGES TABLE
-- Run this script in the Supabase SQL Editor.
-- =====================================================================

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

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "chat_all_authenticated" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.chat_messages;

-- Create policies
-- Admin full access
CREATE POLICY "admin_chats" ON public.chat_messages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customer chats access (auth)
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

-- Guest/Anon chats access for public tracking conversation
CREATE POLICY "chat_select_anon" ON public.chat_messages
    FOR SELECT TO anon
    USING (prescription_id IS NOT NULL);

CREATE POLICY "chat_insert_anon" ON public.chat_messages
    FOR INSERT TO anon
    WITH CHECK (prescription_id IS NOT NULL);

-- Enable Realtime for chat_messages table
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
