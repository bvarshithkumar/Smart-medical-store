-- =====================================================================
-- FIX FOR INFINITE RECURSION IN PROFILES TABLE RLS POLICIES
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Create a security definer function to check if a user is an admin
-- This bypasses RLS policies and avoids infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- 2. Drop existing problematic recursive policies on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;

-- 3. Re-create clean, recursion-free policies for profiles
-- Policy A: Select profiles (own profile OR if viewer is an admin)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- Policy B: Insert profiles (own profile OR if creator is an admin)
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- Policy C: Update profiles (own profile OR if updater is an admin)
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin(auth.uid())
  );

-- Policy D: Delete profiles (admins only)
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
  );

-- 4. Ensure the admin user profile exists and has the 'admin' role
-- The bcb5f00c-6ae1-4486-b46f-0c4df2092ab5 is the UID of admin@svms.com
INSERT INTO public.profiles (id, full_name, email, role, customer_type, phone)
VALUES (
  'bcb5f00c-6ae1-4486-b46f-0c4df2092ab5',
  'Store Admin',
  'admin@svms.com',
  'admin',
  'registered',
  '919876543210'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = 'admin@svms.com';
