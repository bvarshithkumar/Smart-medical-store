-- =====================================================================
-- CMS-ASSETS BUCKET AND STORAGE RLS POLICIES MIGRATION
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. ENSURE BUCKET EXISTS AND IS PUBLIC ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-assets', 
  'cms-assets', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO 
UPDATE SET public = true;

-- ── 2. DROP EXISTING POLICIES FOR THIS BUCKET ────────────────────────
DROP POLICY IF EXISTS "cms_assets_public_select" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets_admin_all" ON storage.objects;

-- ── 3. CREATE POLICIES FOR CMS-ASSETS BUCKET ─────────────────────────

-- Policy A: Allow public read access to all objects in the bucket
CREATE POLICY "cms_assets_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'cms-assets');

-- Policy B: Allow authenticated admin users to insert product images (path starting with products/)
CREATE POLICY "cms_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cms-assets'
    AND name LIKE 'products/%'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy C: Allow authenticated admin users to update product images (path starting with products/)
CREATE POLICY "cms_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cms-assets'
    AND name LIKE 'products/%'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'cms-assets'
    AND name LIKE 'products/%'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy D: Allow authenticated admin users to delete product images (path starting with products/)
CREATE POLICY "cms_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cms-assets'
    AND name LIKE 'products/%'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
