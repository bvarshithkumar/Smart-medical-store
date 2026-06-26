-- =====================================================================
-- GOOGLE AUTH MIGRATION
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Add address column to profiles for Google users completing
--          their profile, and ensure profiles RLS allows self-upsert.
-- =====================================================================

-- 1. Add address column (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Ensure profiles table has correct RLS for self-upsert
--    (Google users upsert their own profile row on first login)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_upsert_own"          ON public.profiles;

-- SELECT: users can read their own profile; admins can read all
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: users can create their own profile row (needed for Google OAuth)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin full access
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 3. Reload PostgREST schema cache so the new column is visible via API
NOTIFY pgrst, 'reload schema';

-- 4. Verify the address column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
