-- =====================================================================
-- DYNAMIC SECTIONS SCHEMAS & POLICIES MIGRATION
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── 1. HEALTH CONCERNS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cms_health_concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    icon_color TEXT DEFAULT '#14b8a6',
    icon_bg TEXT DEFAULT 'rgba(20, 184, 166, 0.12)',
    icon_name TEXT DEFAULT 'Sparkles',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed cms_health_concerns (Initial default items)
TRUNCATE public.cms_health_concerns CASCADE;
INSERT INTO public.cms_health_concerns (name, description, image_url, icon_color, icon_bg, icon_name, display_order, is_active)
VALUES
(
  'Diabetes Care', 'Sugar monitors & care', '/images/concern_diabetes.png', 
  '#EF4444', 'rgba(239, 68, 68, 0.12)', 'Droplet', 10, true
),
(
  'Cardiac Health', 'Blood pressure & heart', '/images/concern_cardiac.png', 
  '#EC4899', 'rgba(236, 72, 153, 0.12)', 'Heart', 20, true
),
(
  'Pain Relief', 'Joints, muscles & bones', '/images/concern_pain.png', 
  '#F97316', 'rgba(249, 115, 22, 0.12)', 'Zap', 30, true
),
(
  'Stomach Care', 'Digestion & acidity', '/images/concern_stomach.png', 
  '#8B5CF6', 'rgba(139, 92, 246, 0.12)', 'Activity', 40, true
),
(
  'Vitamins & Immunity', 'Daily nutrition & energy', '/images/concern_vitamins.png', 
  '#10B981', 'rgba(16, 185, 129, 0.12)', 'Shield', 50, true
),
(
  'Skin & Hair', 'Acne, dry skin & hairfall', '/images/concern_skin.png', 
  '#06B6D4', 'rgba(6, 182, 212, 0.12)', 'Sparkles', 60, true
);


-- ── 2. TRUST PILLERS (WHY CHOOSE US) TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.cms_why_choose_us (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    icon_color TEXT DEFAULT '#14b8a6',
    icon_bg TEXT DEFAULT 'rgba(20, 184, 166, 0.12)',
    icon_border TEXT DEFAULT 'rgba(20, 184, 166, 0.25)',
    icon_name TEXT DEFAULT 'Sparkles',
    badge_text TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed cms_why_choose_us (Initial default items)
TRUNCATE public.cms_why_choose_us CASCADE;
INSERT INTO public.cms_why_choose_us (title, description, image_url, icon_color, icon_bg, icon_border, icon_name, badge_text, display_order, is_active)
VALUES
(
  'Genuine Medicines', '100% genuine prescription drugs and OTC products sourced directly from authorized brand distributors.', 
  '/images/trust_medicines.png', '#0EA5A4', 'rgba(14, 165, 164, 0.12)', 'rgba(14, 165, 164, 0.25)', 'ShieldAlert', '', 10, true
),
(
  'Expert Pharmacists', 'Licensed registered pharmacists available on-site and via consultation to verify your dosage and safety.', 
  '/images/trust_pharmacy.png', '#00A884', 'rgba(0, 168, 132, 0.12)', 'rgba(0, 168, 132, 0.25)', 'Award', '', 20, true
),
(
  'Easy Prescription Upload', 'Upload prescription documents in a single click on our web app or WhatsApp for immediate pharmacist check.', 
  '/images/trust_support.png', '#7c3aed', 'rgba(124, 58, 237, 0.12)', 'rgba(124, 58, 237, 0.25)', 'FileText', '', 30, true
),
(
  'Fast Pickup', 'Skip the queues and secure your ready medicines in a quick 15-minute scheduled store collection window.', 
  '/images/trust_delivery.png', '#ea580c', 'rgba(234, 88, 12, 0.12)', 'rgba(234, 88, 12, 0.25)', 'Clock', '', 40, true
),
(
  'Trusted Since 2010', 'A family-first neighborhood pharmacy serving Chikkadpally & Gachibowli with healthcare integrity for 16 years.', 
  '/images/trust_payments.png', '#3b82f6', 'rgba(59, 130, 246, 0.12)', 'rgba(59, 130, 246, 0.25)', 'Calendar', '16 Yrs', 50, true
),
(
  'Excellent Support', 'Get prompt support, order updates, and advice from our pharmacist hotlines and direct WhatsApp channels.', 
  '/images/trust_support.png', '#06b6d4', 'rgba(6, 182, 212, 0.12)', 'rgba(6, 182, 212, 0.25)', 'MessageSquare', '', 60, true
);


-- ── 3. ENABLE ROW LEVEL SECURITY & POLICIES ────────────────────────────
ALTER TABLE public.cms_health_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_why_choose_us ENABLE ROW LEVEL SECURITY;

-- Health Concerns Policies
DROP POLICY IF EXISTS cms_health_concerns_select_public ON public.cms_health_concerns;
CREATE POLICY cms_health_concerns_select_public ON public.cms_health_concerns
    FOR SELECT TO public
    USING (is_active = true);

DROP POLICY IF EXISTS cms_health_concerns_admin_all ON public.cms_health_concerns;
CREATE POLICY cms_health_concerns_admin_all ON public.cms_health_concerns
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Why Choose Us Policies
DROP POLICY IF EXISTS cms_why_choose_us_select_public ON public.cms_why_choose_us;
CREATE POLICY cms_why_choose_us_select_public ON public.cms_why_choose_us
    FOR SELECT TO public
    USING (is_active = true);

DROP POLICY IF EXISTS cms_why_choose_us_admin_all ON public.cms_why_choose_us;
CREATE POLICY cms_why_choose_us_admin_all ON public.cms_why_choose_us
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
