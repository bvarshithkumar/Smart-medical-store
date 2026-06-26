-- =====================================================================
-- SRI VENKATESHWARA MEDICAL STORE — HOMEPAGE SECTIONS SCHEMAS & POLICIES
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. CREATE DYNAMIC HOMEPAGE SECTIONS TABLE ────────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL,
    section_name TEXT NOT NULL,
    section_title TEXT,
    section_subtitle TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    max_items INTEGER DEFAULT 6,
    layout_type TEXT DEFAULT 'grid', -- grid, carousel, slider, list
    sort_type TEXT DEFAULT 'manual', -- manual, newest, oldest, alphabetical, custom
    mobile_layout TEXT DEFAULT 'carousel', -- 1 card, 2 cards, horizontal scroll, carousel
    desktop_layout TEXT DEFAULT 'grid', -- 2 columns, 3 columns, 4 columns, 5 columns, carousel
    background_color TEXT DEFAULT 'transparent',
    background_image_url TEXT,
    custom_css_class TEXT,
    padding_top INTEGER DEFAULT 40,
    padding_bottom INTEGER DEFAULT 40,
    status TEXT DEFAULT 'published', -- draft, published
    draft_config JSONB,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    total_clicks INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ── 2. CREATE HOMEPAGE SECTION VERSIONS TABLE ───────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_section_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ── 3. ENABLE ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_versions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS homepage_sections_select_policy ON public.homepage_sections;
DROP POLICY IF EXISTS homepage_sections_admin_all ON public.homepage_sections;
DROP POLICY IF EXISTS homepage_section_versions_select_policy ON public.homepage_section_versions;
DROP POLICY IF EXISTS homepage_section_versions_admin_all ON public.homepage_section_versions;

-- ── 4. RLS POLICIES FOR HOMEPAGE SECTIONS ───────────────────────────
-- Public can read published, visible, and currently-scheduled sections.
-- Admins can read all sections (visible or hidden, published or draft).
CREATE POLICY homepage_sections_select_policy ON public.homepage_sections
    FOR SELECT TO public
    USING (
        (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        ) OR (
            is_visible = true 
            AND (start_date IS NULL OR start_date <= now())
            AND (end_date IS NULL OR end_date >= now())
        )
    );

-- Admins have full access to create, update, delete
CREATE POLICY homepage_sections_admin_all ON public.homepage_sections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ── 5. RLS POLICIES FOR SECTION VERSIONS ─────────────────────────────
-- Only admins can read/write versions
CREATE POLICY homepage_section_versions_select_policy ON public.homepage_section_versions
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY homepage_section_versions_admin_all ON public.homepage_section_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ── 6. CREATE SECURITY DEFINER COUNTER INCREMENT FUNCTIONS ───────────
-- These functions allow public users to record views and clicks safely
CREATE OR REPLACE FUNCTION public.increment_section_views(sec_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.homepage_sections
  SET total_views = total_views + 1
  WHERE section_key = sec_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_section_clicks(sec_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.homepage_sections
  SET total_clicks = total_clicks + 1
  WHERE section_key = sec_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. SEED INITIAL HOMEPAGE CONFIGURATION ──────────────────────────
-- Insert all 18 current sections of the website
INSERT INTO public.homepage_sections 
(section_key, section_name, section_title, section_subtitle, display_order, max_items, layout_type, sort_type, desktop_layout, mobile_layout, background_color, padding_top, padding_bottom)
VALUES
('hero_slides', 'Hero Carousel', 'Sri Venkateshwara Medical Store', 'Your Trusted Pharmacy in Gachibowli', 0, 5, 'carousel', 'manual', 'carousel', 'carousel', 'transparent', 0, 0),
('statistics', 'Statistics Bar', 'SVMS Trust Pillars', 'By the numbers', 10, 4, 'grid', 'manual', '4 columns', '2 cards', 'transparent', 20, 20),
('quick_actions', 'Quick Actions', 'Quick Actions', 'Instant pharmaceutical access', 20, 4, 'grid', 'manual', '4 columns', '2 cards', 'transparent', 20, 25),
('categories', 'Medicine Categories', 'Medicine Categories', 'Browse our wide range of medicines and wellness items by therapeutic category.', 30, 6, 'grid', 'manual', '6 columns', 'horizontal scroll', 'transparent', 40, 40),
('popular_medicines', 'Popular Medicines', 'Popular Medicines', 'Most purchased healthcare products trusted by our customers.', 40, 8, 'grid', 'manual', '4 columns', '2 cards', 'transparent', 40, 40),
('offers', 'Promotional Offers', 'Today''s Deals', 'Save big on wellness essentials and chronic medicines.', 50, 4, 'grid', 'manual', '2 columns', 'horizontal scroll', 'transparent', 45, 45),
('wellness_essentials', 'Wellness Essentials', 'Daily Health Care', 'Wellness essentials carefully picked for your healthy lifestyle.', 60, 4, 'grid', 'manual', '4 columns', 'horizontal scroll', 'transparent', 40, 40),
('health_concerns', 'Shop by Health Concern', 'Shop by Health Concern', 'Find products curated for specific health conditions.', 70, 6, 'grid', 'manual', '6 columns', 'horizontal scroll', 'transparent', 40, 40),
('banners', 'Upload Rx Banner', 'Upload Prescription', 'Licensed pharmacists will review and prepare your order in minutes.', 80, 1, 'list', 'manual', '1 columns', '1 card', 'transparent', 30, 30),
('prescription_tracker', 'Prescription Tracker', 'Prescription Review Tracking', 'Track the status of your uploaded prescription quote in real-time.', 90, 1, 'list', 'manual', '1 columns', '1 card', 'transparent', 20, 30),
('why_choose_us', 'Core Trust Pillars', 'Why Choose SVMS', 'We guarantee authenticity, speed, and safety in every step.', 100, 4, 'grid', 'manual', '4 columns', '2 cards', 'transparent', 40, 40),
('brands', 'Featured Brands', 'Featured Brands', 'Top pharma brands you can trust.', 110, 8, 'carousel', 'manual', 'carousel', 'horizontal scroll', 'transparent', 40, 40),
('how_it_works', 'Pickup Workflow', 'How SVMS Scheduled Pickup Works', 'Follow these three simple steps to reserve and pick up your medicines.', 120, 3, 'grid', 'manual', '3 columns', '1 card', 'transparent', 40, 40),
('testimonials', 'Customer Testimonials', 'What Our Customers Say', 'Trusted by thousands of happy customers.', 130, 6, 'carousel', 'manual', 'carousel', 'carousel', 'transparent', 40, 40),
('health_tips', 'Pharmacist Health Tips', 'Health Tips', 'Stay healthy with trusted pharmacy advice.', 140, 3, 'grid', 'manual', '3 columns', 'horizontal scroll', '#0B1220', 40, 40),
('about_us', 'About Us Story', 'Sri Venkateshwara Medical Store', 'Serving the Gachibowli community with passion and integrity since 2010.', 150, 1, 'list', 'manual', '1 columns', '1 card', 'transparent', 40, 40),
('pharmacist_info', 'Store & Pharmacist Info', 'Store Information & Contact', 'Drop by our physical store or consult with our pharmacist.', 160, 1, 'list', 'manual', '1 columns', '1 card', 'transparent', 40, 40),
('faqs', 'Frequently Asked Questions', 'Frequently Asked Questions', 'Quick answers to common questions about online medicine orders.', 170, 10, 'list', 'manual', '2 columns', '1 card', 'transparent', 40, 40)
ON CONFLICT (section_key) DO UPDATE SET
    section_name = EXCLUDED.section_name,
    section_title = COALESCE(homepage_sections.section_title, EXCLUDED.section_title),
    section_subtitle = COALESCE(homepage_sections.section_subtitle, EXCLUDED.section_subtitle),
    display_order = COALESCE(homepage_sections.display_order, EXCLUDED.display_order),
    max_items = COALESCE(homepage_sections.max_items, EXCLUDED.max_items),
    layout_type = COALESCE(homepage_sections.layout_type, EXCLUDED.layout_type),
    desktop_layout = COALESCE(homepage_sections.desktop_layout, EXCLUDED.desktop_layout),
    mobile_layout = COALESCE(homepage_sections.mobile_layout, EXCLUDED.mobile_layout);

-- ── 8. ENABLE REALTIME REPLICATION ───────────────────────────────────
ALTER TABLE public.homepage_sections REPLICA IDENTITY FULL;
ALTER TABLE public.homepage_section_versions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_sections;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_section_versions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ── 9. RELOAD POSTGREST CACHE ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';
