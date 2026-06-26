-- =====================================================================
-- HOMEPAGE FEATURED PRODUCTS (WELLNESS ESSENTIALS) SCHEMAS & POLICIES
-- =====================================================================

-- ── 1. CREATE SECTION CONFIGURATION TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_featured_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_title TEXT DEFAULT 'Daily Health & Care',
    section_subtitle TEXT DEFAULT 'Curated wellness formulations and diagnostic care for your family.',
    badge_text TEXT DEFAULT 'Wellness Essentials',
    cta_text TEXT DEFAULT 'View All Wellness',
    cta_link TEXT DEFAULT '/',
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 60,
    max_products INTEGER DEFAULT 4,
    layout_type TEXT DEFAULT 'grid', -- grid, carousel
    background_image TEXT,
    background_color TEXT DEFAULT 'transparent',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ── 2. CREATE FEATURED PRODUCTS ITEMS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_featured_products_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT, -- override product image
    title TEXT, -- override product name
    short_description TEXT, -- override product description
    price NUMERIC, -- override product selling_price
    old_price NUMERIC, -- override product mrp
    category TEXT, -- override product category
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ── 3. ENABLE ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.homepage_featured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_featured_products_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS featured_products_select ON public.homepage_featured_products;
DROP POLICY IF EXISTS featured_products_admin_all ON public.homepage_featured_products;
DROP POLICY IF EXISTS featured_products_items_select ON public.homepage_featured_products_items;
DROP POLICY IF EXISTS featured_products_items_admin_all ON public.homepage_featured_products_items;

-- ── 4. RLS POLICIES FOR HOMEPAGE FEATURED PRODUCTS ─────────────────────
-- Public can read active configuration
CREATE POLICY featured_products_select ON public.homepage_featured_products
    FOR SELECT TO public
    USING (is_visible = true OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Admins can do anything
CREATE POLICY featured_products_admin_all ON public.homepage_featured_products
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- ── 5. RLS POLICIES FOR FEATURED PRODUCTS ITEMS ────────────────────────
-- Public can read active items
CREATE POLICY featured_products_items_select ON public.homepage_featured_products_items
    FOR SELECT TO public
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Admins can do anything
CREATE POLICY featured_products_items_admin_all ON public.homepage_featured_products_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- ── 6. SEED INITIAL FEATURED PRODUCTS CONFIG & DEFAULT ITEMS ────────────
-- Seed 1 section row
INSERT INTO public.homepage_featured_products 
(id, section_title, section_subtitle, badge_text, cta_text, cta_link, is_visible, display_order, max_products, layout_type, background_color)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Daily Health & Care', 'Curated wellness formulations and diagnostic care for your family.', 'Wellness Essentials', 'View All Wellness', '/', true, 60, 4, 'grid', 'transparent')
ON CONFLICT (id) DO NOTHING;

-- Seed default items mapping if they exist
-- Let's associate two of our active products as default items (Zincovit and Relief-Max Pain Gel)
DO $$
DECLARE
    zinc_id UUID;
    pain_id UUID;
BEGIN
    SELECT id INTO zinc_id FROM public.products WHERE name = 'Zincovit Multivitamins' LIMIT 1;
    SELECT id INTO pain_id FROM public.products WHERE name = 'Relief-Max Pain Gel' LIMIT 1;
    
    IF zinc_id IS NOT NULL THEN
        INSERT INTO public.homepage_featured_products_items (product_id, display_order, is_active, is_featured)
        VALUES (zinc_id, 0, true, true);
    END IF;

    IF pain_id IS NOT NULL THEN
        INSERT INTO public.homepage_featured_products_items (product_id, display_order, is_active, is_featured)
        VALUES (pain_id, 1, true, false);
    END IF;
END $$;

-- ── 7. ENABLE REALTIME REPLICATION ───────────────────────────────────
alter publication supabase_realtime add table public.homepage_featured_products;
alter publication supabase_realtime add table public.homepage_featured_products_items;
