-- =====================================================================
-- SRI VENKATESHWARA MEDICAL STORE — HOMEPAGE CMS MIGRATION
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. CREATE STORAGE BUCKET FOR CMS ASSETS ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-assets',
  'cms-assets',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ── 2. CREATE STORAGE POLICIES FOR CMS ASSETS ───────────────────────
DROP POLICY IF EXISTS "cms_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "admin_cms_assets_all" ON storage.objects;

-- Allow public read of cms-assets
CREATE POLICY "cms_assets_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'cms-assets');

-- Admin full access to cms-assets
CREATE POLICY "admin_cms_assets_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'cms-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'cms-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ── 3. CREATE CMS DATABASE TABLES ───────────────────────────────────

-- Table 1: cms_hero (carousel slides)
CREATE TABLE IF NOT EXISTS public.cms_hero (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT,
    title TEXT NOT NULL,
    title_highlight TEXT,
    description TEXT,
    image_url TEXT,
    button_text TEXT,
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    bg_gradient TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    bottom_badges JSONB DEFAULT '[]'::jsonb,
    tag_style JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 2: cms_categories (category cards)
CREATE TABLE IF NOT EXISTS public.cms_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT,
    image_url TEXT,
    product_count TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 3: cms_quick_actions (action cards)
CREATE TABLE IF NOT EXISTS public.cms_quick_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    badge TEXT,
    image_url TEXT,
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 4: cms_offers (promotional offers)
CREATE TABLE IF NOT EXISTS public.cms_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    code TEXT,
    image_url TEXT,
    alt_text TEXT,
    button_text TEXT,
    button_link TEXT,
    bg_color TEXT,
    badge TEXT,
    badge_bg TEXT,
    shadow_color TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 5: cms_tips (pharmacist health blog articles)
CREATE TABLE IF NOT EXISTS public.cms_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    alt_text TEXT,
    tag TEXT,
    bg_color TEXT,
    tag_color TEXT,
    button_text TEXT,
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 6: cms_testimonials (customer reviews)
CREATE TABLE IF NOT EXISTS public.cms_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    role TEXT,
    location TEXT,
    category TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 7: cms_pharmacist (pharmacist consult data)
CREATE TABLE IF NOT EXISTS public.cms_pharmacist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    description TEXT,
    image_url TEXT,
    button_text TEXT,
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 8: cms_banners (backgrounds / promotional graphics)
CREATE TABLE IF NOT EXISTS public.cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    alt_text TEXT,
    button_text TEXT,
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 9: cms_brands (featured brand list, metadata, and packaging styles)
CREATE TABLE IF NOT EXISTS public.cms_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    badge TEXT,
    logo_svg TEXT,
    image_url TEXT,
    color TEXT,
    box_name TEXT,
    box_sub TEXT,
    pack_class TEXT,
    pills_colors TEXT[] DEFAULT ARRAY[]::TEXT[],
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ── 4. ENABLE ROW LEVEL SECURITY (RLS) FOR ALL CMS TABLES ──────────
ALTER TABLE public.cms_hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_quick_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pharmacist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_brands ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS POLICIES FOR DATABASE TABLES ─────────────────────────────
-- Helper SQL snippet generator for CMS table read/write policies:
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'cms_hero', 'cms_categories', 'cms_quick_actions', 'cms_offers', 
        'cms_tips', 'cms_testimonials', 'cms_pharmacist', 'cms_banners', 'cms_brands'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        -- Drop old policies if exist
        EXECUTE format('DROP POLICY IF EXISTS %I_select_public ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', tbl, tbl);

        -- Create public read policy
        EXECUTE format('
            CREATE POLICY %I_select_public ON public.%I
                FOR SELECT TO public
                USING (is_active = true)
        ', tbl, tbl);

        -- Create admin write policy
        EXECUTE format('
            CREATE POLICY %I_admin_all ON public.%I
                FOR ALL TO authenticated
                USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))
                WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))
        ', tbl, tbl);
    END LOOP;
END $$;

-- ── 6. SEED INITIAL HIGH-FIDELITY HOMEPAGE CONTENT ─────────────────

-- Seed Table 1: cms_hero (carousel slides)
TRUNCATE public.cms_hero CASCADE;
INSERT INTO public.cms_hero (tag, title, title_highlight, description, image_url, button_text, button_link, display_order, bg_gradient, features, tag_style)
VALUES
(
  'Prescription Upload 📄', 'Upload Prescription', 'Reviewed by Licensed Pharmacists', 
  'Upload your prescription securely. Our licensed pharmacists review it, prepare the required medicines, and notify you when they are ready for pickup.',
  '/images/hero_upload_scene.png', 'Upload Prescription', 'upload', 0,
  'linear-gradient(135deg, #022C22 0%, #042F2E 60%, #0F766E 100%)',
  '["Licensed Pharmacist Review", "15 Minute Review", "Secure Upload"]'::jsonb,
  '{"bg": "rgba(20, 184, 166, 0.12)", "border": "rgba(20, 184, 166, 0.25)", "color": "#14b8a6"}'::jsonb
),
(
  'Express Reservation ⚡', 'Reserve Medicines Online', 'Ready in 15 Minutes', 
  'Reserve medicines instantly and collect them from the store without waiting.',
  '/images/hero_pickup_scene.png', 'Reserve Medicines', 'shop', 1,
  'linear-gradient(135deg, #091E3A 0%, #0A2E5C 60%, #1E40AF 100%)',
  '["Fast Reservation", "Real-Time Availability", "Quick Collection"]'::jsonb,
  '{"bg": "rgba(59, 130, 246, 0.12)", "border": "rgba(59, 130, 246, 0.25)", "color": "#60a5fa"}'::jsonb
),
(
  'Genuine Guarantee 🛡️', '100% Genuine Medicines', 'Certified & Trusted Stock', 
  'Medicines sourced directly from verified pharmaceutical suppliers.',
  '/images/hero_genuine_scene.png', 'Explore Medicines', 'shop', 2,
  'linear-gradient(135deg, #1E1B4B 0%, #311042 60%, #581C87 100%)',
  '["Verified Suppliers", "Quality Assured", "Trusted Brands"]'::jsonb,
  '{"bg": "rgba(124, 92, 246, 0.12)", "border": "rgba(124, 92, 246, 0.25)", "color": "#a78bfa"}'::jsonb
),
(
  'Expert Advice 💬', 'Talk To Pharmacist', 'Expert Guidance & Assistance', 
  'Get help from licensed pharmacists regarding medicines, dosage, and prescription clarification.',
  '/images/rx_hero_pharmacist.png', 'Ask Pharmacist', 'pharmacist', 3,
  'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)',
  '["Licensed Pharmacists", "Expert Advice", "Quick Support"]'::jsonb,
  '{"bg": "rgba(236, 72, 153, 0.12)", "border": "rgba(236, 72, 153, 0.25)", "color": "#f472b6"}'::jsonb
),
(
  'Scheduled Pickup 🕐', 'Schedule Pickup', 'Convenient Collection Experience', 
  'Choose a pickup time that suits you and collect medicines quickly.',
  '/images/hero_pickup_scene.png', 'Schedule Pickup', 'pickup', 4,
  'linear-gradient(135deg, #2c1d11 0%, #3d2208 60%, #b45309 100%)',
  '["Flexible Timing", "Fast Collection", "Easy Scheduling"]'::jsonb,
  '{"bg": "rgba(245, 158, 11, 0.12)", "border": "rgba(245, 158, 11, 0.25)", "color": "#fbbf24"}'::jsonb
);

-- Seed Table 2: cms_categories (category cards)
TRUNCATE public.cms_categories CASCADE;
INSERT INTO public.cms_categories (name, color, image_url, product_count, display_order)
VALUES
('Medicines', '#00A884', '/images/cat_medicines.png', '1,200+ Products', 0),
('Wellness', '#00a896', '/images/cat_wellness.png', '850+ Products', 1),
('Personal Care', '#ea580c', '/images/cat_personal.png', '640+ Products', 2),
('Health Devices', '#3b82f6', '/images/cat_devices.png', '250+ Products', 3),
('Diabetes Care', '#ef4444', '/images/cat_diabetes.png', '420+ Products', 4),
('Baby Care', '#8b5cf6', '/images/cat_baby.png', '380+ Products', 5);

-- Seed Table 3: cms_quick_actions (action cards)
TRUNCATE public.cms_quick_actions CASCADE;
INSERT INTO public.cms_quick_actions (title, description, badge, image_url, button_link, display_order)
VALUES
('Schedule Pickup', 'Ready at Gachibowli store', 'Fast Pickup', '/images/action_pickup.png', '/pickup', 0),
('Upload Prescription', 'Pharmacist verified in mins', 'Instant Review', '/images/action_upload.png', 'upload', 1),
('Repeat Order', 'Reorder chronic medicines', 'Easy Reorder', '/images/action_repeat.png', 'repeat', 2),
('Talk to Pharmacist', 'Free healthcare assistance', 'Consult Free', '/images/action_pharmacist.png', 'pharmacist', 3);

-- Seed Table 4: cms_offers (promotional offers)
TRUNCATE public.cms_offers CASCADE;
INSERT INTO public.cms_offers (title, description, code, image_url, alt_text, button_text, button_link, bg_color, badge, badge_bg, shadow_color, display_order)
VALUES
(
  'First Prescription\nUpload Offer', 'Get flat 15% discount on your first prescription order reservation.', 'FIRST15', 
  '/images/action_upload.png', 'Prescription Promo Icon', 'Copy Code', '/', 
  'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)', 'New Customer', 'rgba(2, 132, 199, 0.2)', 'rgba(2, 132, 199, 0.15)', 0
),
(
  'Wellness Products\nFlash Sale', 'Up to 25% discount on premium daily wellness formulations.', 'WELL25', 
  '/images/cat_wellness.png', 'Wellness Promo Icon', 'Copy Code', '/', 
  'linear-gradient(135deg, #1e1b4b 0%, #311042 60%, #581c87 100%)', 'Flash Sale', 'rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.15)', 1
);

-- Seed Table 5: cms_tips (pharmacist health blog articles)
TRUNCATE public.cms_tips CASCADE;
INSERT INTO public.cms_tips (title, description, image_url, alt_text, tag, bg_color, tag_color, button_text, button_link, display_order)
VALUES
(
  'Managing Diabetes Daily', 'Simple dietary habits and glucose tracking tips from our senior pharmacist.', 
  '/images/cat_diabetes.png', 'Diabetes glucose checking', 'Diabetes', 'linear-gradient(to right, #0b1528, #0e1e38)', '#ef4444', 'Read Guide', '/', 0
),
(
  'Boosting Immune Health', 'Essential multivitamins and natural boosters to strengthen your immune system.', 
  '/images/cat_wellness.png', 'Immune health products', 'Immunity', 'linear-gradient(to right, #0b1528, #0e1e38)', '#10b981', 'Read Guide', '/', 1
),
(
  'Essential Pain Relief Care', 'How to manage joint pain and muscle pulls with proper topical treatments.', 
  '/images/cat_medicines.png', 'Pain relief gels and sprays', 'Pain Care', 'linear-gradient(to right, #0b1528, #0e1e38)', '#f59e0b', 'Read Guide', '/', 2
);

-- Seed Table 6: cms_testimonials (customer reviews)
TRUNCATE public.cms_testimonials CASCADE;
INSERT INTO public.cms_testimonials (name, rating, comment, role, location, category, image_url, display_order)
VALUES
(
  'Rajesh Kumar', 5, 'Uploading prescriptions was so easy. The Gachibowli store pharmacist verified it in 10 minutes, and I picked it up on my way home without waiting in queue!', 
  'Verified Patient', 'Gachibowli', 'Prescription Order', '/images/customer_1.png', 0
),
(
  'Priya Sharma', 5, 'I regularly order wellness and diabetes care products for my parents. SVMS is always fully stocked and their prices are very fair. The staff is extremely knowledgeable!', 
  'Regular Customer', 'Kondapur', 'Wellness Reservation', '/images/customer_2.png', 1
),
(
  'Vikram Aditya', 5, 'The online reservation system is outstanding. I reserved a pulse oximeter and nebulizer; they were packed and ready when I walked in. Exceptional store experience.', 
  'Tech Professional', 'Hitec City', 'Health Devices', '/images/customer_3.png', 2
);

-- Seed Table 7: cms_pharmacist (pharmacist consult data)
TRUNCATE public.cms_pharmacist CASCADE;
INSERT INTO public.cms_pharmacist (name, role, description, image_url, button_text, button_link, display_order)
VALUES
('Consult a Pharmacist', 'Registered Pharmacist', 'Speak directly with our registered pharmacist regarding medicines, dosage, and prescription clarification.', '/images/rx_hero_pharmacist.png', 'Call Now', 'tel:+919876543210', 0);

-- Seed Table 8: cms_banners (backgrounds / promotional graphics)
TRUNCATE public.cms_banners CASCADE;
INSERT INTO public.cms_banners (banner_key, title, description, image_url, display_order)
VALUES
('upload-rx-bg', 'Upload Prescription Banner BG', 'Dynamic background graphic for prescription section', '/images/rx_section_bg.png', 0);

-- Seed Table 9: cms_brands (featured brand list, metadata, and packaging styles)
TRUNCATE public.cms_brands CASCADE;
INSERT INTO public.cms_brands (name, badge, color, box_name, box_sub, pack_class, pills_colors, display_order)
VALUES
('Cipla', 'Trusted Worldwide', '#00529b', 'Paracetamol', '500 mg Tablets', 'cipla-para', ARRAY['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 0),
('Abbott', 'Quality Assured', '#009FDF', 'SURE-D Z', 'Multivitamins', 'abbott-sure', ARRAY['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'], 1),
('Sun Pharma', 'Trusted Quality', '#E65100', 'Levosalbutamol', 'Sun Pharma', 'sun-levo', ARRAY['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 2),
('Lupin', 'Research Driven', '#2E7D32', 'Budecort', 'Lupin', 'lupin-bude', ARRAY['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 3),
('Glenmark', 'Doctor Recommended', '#e11d48', 'Telma 40', 'Glenmark', 'glenmark-telma', ARRAY['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 4),
('GSK', 'Innovation in Care', '#F05023', 'Citrazin', 'Vitamin C', 'gsk-citra', ARRAY['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'], 5),
('Pfizer', 'Global Trusted Brand', '#00A3E0', 'Zithromax', '250 mg Tablets', 'pfizer-zithro', ARRAY['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 6);

-- Enable Realtime for all CMS tables DO $$
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'cms_hero', 'cms_categories', 'cms_quick_actions', 'cms_offers', 
        'cms_tips', 'cms_testimonials', 'cms_pharmacist', 'cms_banners', 'cms_brands'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END $$;
