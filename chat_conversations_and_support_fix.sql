-- ─────────────────────────────────────────────────────────────────────
-- CHAT CONVERSATIONS AND SUPPORT FIX SCHEMA
-- Run this script in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────

-- 1. Create the public.chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    status TEXT DEFAULT 'open', -- 'open' | 'waiting_for_customer' | 'resolved' | 'closed'
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    unread_count_admin INTEGER DEFAULT 0,
    unread_count_customer INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on public.chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_all_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "customer_all_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "anon_all_conversations" ON public.chat_conversations;

-- Create policies for public.chat_conversations
CREATE POLICY "admin_all_conversations" ON public.chat_conversations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "customer_all_conversations" ON public.chat_conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL)
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "anon_all_conversations" ON public.chat_conversations
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 2. Create the public.chat_messages table if it does not exist
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

-- Enable RLS on public.chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_chats" ON public.chat_messages;
DROP POLICY IF EXISTS "customer_chats" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_select_anon" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_anon" ON public.chat_messages;

-- Create policies for public.chat_messages
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

DROP POLICY IF EXISTS "chat_select_anon" ON public.chat_messages;
CREATE POLICY "chat_select_anon" ON public.chat_messages
    FOR SELECT TO anon
    USING (prescription_id IS NOT NULL OR customer_name LIKE 'Guest:%');

DROP POLICY IF EXISTS "chat_insert_anon" ON public.chat_messages;
CREATE POLICY "chat_insert_anon" ON public.chat_messages
    FOR INSERT TO anon
    WITH CHECK (prescription_id IS NOT NULL OR customer_name LIKE 'Guest:%');

-- Add support chat columns to public.chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'delivered'; -- 'sending' | 'delivered' | 'read' | 'failed'
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 3. Create Trigger Function to automatically map chat messages to conversations and update metrics
CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
    cust_phone TEXT := NULL;
    cust_email TEXT := NULL;
    u_role TEXT := 'customer';
BEGIN
    -- 1. Determine conversation matching rules
    -- Check if there is an active (status != 'closed') conversation already
    IF NEW.conversation_id IS NOT NULL THEN
        conv_id := NEW.conversation_id;
    ELSIF NEW.user_id IS NOT NULL THEN
        SELECT id INTO conv_id 
        FROM public.chat_conversations 
        WHERE user_id = NEW.user_id AND status != 'closed' 
        ORDER BY updated_at DESC LIMIT 1;
    ELSE
        SELECT id INTO conv_id 
        FROM public.chat_conversations 
        WHERE customer_name = NEW.customer_name AND status != 'closed' 
        ORDER BY updated_at DESC LIMIT 1;
    END IF;

    -- 2. If no active conversation exists, create a new one automatically
    IF conv_id IS NULL THEN
        -- Attempt to resolve phone and email for registered user
        IF NEW.user_id IS NOT NULL THEN
            SELECT phone, phone_number, full_name INTO cust_phone, cust_phone, NEW.customer_name 
            FROM public.profiles 
            WHERE id = NEW.user_id LIMIT 1;
            
            -- Fallback
            SELECT email INTO cust_email 
            FROM auth.users 
            WHERE id = NEW.user_id LIMIT 1;
        -- Attempt to parse Guest details e.g. "Guest: guest_123 (Sathwik)"
        ELSIF NEW.customer_name LIKE 'Guest:%' THEN
            BEGIN
                cust_phone := 'Guest Support Session';
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        INSERT INTO public.chat_conversations (
            user_id,
            customer_name,
            customer_phone,
            customer_email,
            status,
            last_message,
            last_message_time,
            unread_count_admin,
            unread_count_customer,
            is_archived
        ) VALUES (
            NEW.user_id,
            NEW.customer_name,
            cust_phone,
            cust_email,
            'open',
            COALESCE(NEW.message, 'Attachment (Image/File)'),
            NEW.created_at,
            CASE WHEN NEW.sender_role = 'customer' THEN 1 ELSE 0 END,
            CASE WHEN NEW.sender_role = 'pharmacist' THEN 1 ELSE 0 END,
            false
        ) RETURNING id INTO conv_id;
    ELSE
        -- 3. Update existing conversation meta
        UPDATE public.chat_conversations
        SET 
            last_message = COALESCE(NEW.message, 'Attachment (Image/File)'),
            last_message_time = NEW.created_at,
            unread_count_admin = CASE WHEN NEW.sender_role = 'customer' THEN unread_count_admin + 1 ELSE unread_count_admin END,
            unread_count_customer = CASE WHEN NEW.sender_role = 'pharmacist' THEN unread_count_customer + 1 ELSE unread_count_customer END,
            status = CASE WHEN NEW.sender_role = 'customer' THEN 'open'::text ELSE status END, -- reset to open if customer messages
            updated_at = timezone('utc'::text, now())
        WHERE id = conv_id;
    END IF;

    -- Attach conversation ID to the new message row
    NEW.conversation_id := conv_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on public.chat_messages
DROP TRIGGER IF EXISTS trg_chat_message_insert ON public.chat_messages;
CREATE TRIGGER trg_chat_message_insert
    BEFORE INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_chat_message_insert();

-- 4. Set Replica and Publication settings for Realtime sync
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
