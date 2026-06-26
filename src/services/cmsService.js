import { supabase } from '../lib/supabase';

// ── DEFAULT STATIC FALLBACK DATA ─────────────────────────────────────

const DEFAULT_HERO_SLIDES = [
  {
    id: 'HS1',
    tag: 'Prescription Upload 📄',
    title: 'Upload Prescription',
    title_highlight: 'Reviewed by Licensed Pharmacists',
    description: 'Upload your prescription securely. Our licensed pharmacists review it, prepare the required medicines, and notify you when they are ready for pickup.',
    image_url: '/images/hero_upload_scene.png',
    button_text: 'Upload Prescription',
    button_link: 'upload',
    bg_gradient: 'linear-gradient(135deg, #022C22 0%, #042F2E 60%, #0F766E 100%)',
    features: ['Licensed Pharmacist Review', '15 Minute Review', 'Secure Upload'],
    tag_style: { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.25)', color: '#14b8a6' }
  },
  {
    id: 'HS2',
    tag: 'Express Reservation ⚡',
    title: 'Reserve Medicines Online',
    title_highlight: 'Ready in 15 Minutes',
    description: 'Reserve medicines instantly and collect them from the store without waiting.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Reserve Medicines',
    button_link: 'shop',
    bg_gradient: 'linear-gradient(135deg, #091E3A 0%, #0A2E5C 60%, #1E40AF 100%)',
    features: ['Fast Reservation', 'Real-Time Availability', 'Quick Collection'],
    tag_style: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa' }
  },
  {
    id: 'HS3',
    tag: 'Genuine Guarantee 🛡️',
    title: '100% Genuine Medicines',
    title_highlight: 'Certified & Trusted Stock',
    description: 'Medicines sourced directly from verified pharmaceutical suppliers.',
    image_url: '/images/hero_genuine_scene.png',
    button_text: 'Explore Medicines',
    button_link: 'shop',
    bg_gradient: 'linear-gradient(135deg, #1E1B4B 0%, #311042 60%, #581C87 100%)',
    features: ['Verified Suppliers', 'Quality Assured', 'Trusted Brands'],
    tag_style: { bg: 'rgba(124, 92, 246, 0.12)', border: 'rgba(124, 92, 246, 0.25)', color: '#a78bfa' }
  },
  {
    id: 'HS4',
    tag: 'Expert Advice 💬',
    title: 'Talk To Pharmacist',
    title_highlight: 'Expert Guidance & Assistance',
    description: 'Get help from licensed pharmacists regarding medicines, dosage, and prescription clarification.',
    image_url: '/images/rx_hero_pharmacist.png',
    button_text: 'Ask Pharmacist',
    button_link: 'pharmacist',
    bg_gradient: 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)',
    features: ['Licensed Pharmacists', 'Expert Advice', 'Quick Support'],
    tag_style: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', color: '#f472b6' }
  },
  {
    id: 'HS5',
    tag: 'Scheduled Pickup 🕐',
    title: 'Schedule Pickup',
    title_highlight: 'Convenient Collection Experience',
    description: 'Choose a pickup time that suits you and collect medicines quickly.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Schedule Pickup',
    button_link: 'pickup',
    bg_gradient: 'linear-gradient(135deg, #2c1d11 0%, #3d2208 60%, #b45309 100%)',
    features: ['Flexible Timing', 'Fast Collection', 'Easy Scheduling'],
    tag_style: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
  }
];

const DEFAULT_CATEGORIES = [
  { id: 'CAT1', name: 'Medicines', color: '#00A884', image_url: '/images/cat_medicines.png', product_count: '1,200+ Products' },
  { id: 'CAT2', name: 'Wellness', color: '#00a896', image_url: '/images/cat_wellness.png', product_count: '850+ Products' },
  { id: 'CAT3', name: 'Personal Care', color: '#ea580c', image_url: '/images/cat_personal.png', product_count: '640+ Products' },
  { id: 'CAT4', name: 'Health Devices', color: '#3b82f6', image_url: '/images/cat_devices.png', product_count: '250+ Products' },
  { id: 'CAT5', name: 'Diabetes Care', color: '#ef4444', image_url: '/images/cat_diabetes.png', product_count: '420+ Products' },
  { id: 'CAT6', name: 'Baby Care', color: '#8b5cf6', image_url: '/images/cat_baby.png', product_count: '380+ Products' }
];

const DEFAULT_QUICK_ACTIONS = [
  { id: 'QA1', title: 'Schedule Pickup', description: 'Ready at Gachibowli store', badge: 'Fast Pickup', image_url: '/images/action_pickup.png', button_link: '/pickup' },
  { id: 'QA2', title: 'Upload Prescription', description: 'Pharmacist verified in mins', badge: 'Instant Review', image_url: '/images/action_upload.png', button_link: 'upload' },
  { id: 'QA3', title: 'Repeat Order', description: 'Reorder chronic medicines', badge: 'Easy Reorder', image_url: '/images/action_repeat.png', button_link: 'repeat' },
  { id: 'QA4', title: 'Talk to Pharmacist', description: 'Free healthcare assistance', badge: 'Consult Free', image_url: '/images/action_pharmacist.png', button_link: 'pharmacist' }
];

const DEFAULT_OFFERS = [
  {
    id: 'OFF1',
    title: 'First Prescription\nUpload Offer',
    description: 'Get flat 15% discount on your first prescription order reservation.',
    code: 'FIRST15',
    image_url: '/images/action_upload.png',
    alt_text: 'Prescription Promo Icon',
    button_text: 'Copy Code',
    button_link: '/',
    bg_color: 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)',
    badge: 'New Customer',
    badge_bg: 'rgba(2, 132, 199, 0.2)',
    shadow_color: 'rgba(2, 132, 199, 0.15)'
  },
  {
    id: 'OFF2',
    title: 'Wellness Products\nFlash Sale',
    description: 'Up to 25% discount on premium daily wellness formulations.',
    code: 'WELL25',
    image_url: '/images/cat_wellness.png',
    alt_text: 'Wellness Promo Icon',
    button_text: 'Copy Code',
    button_link: '/',
    bg_color: 'linear-gradient(135deg, #1e1b4b 0%, #311042 60%, #581c87 100%)',
    badge: 'Flash Sale',
    badge_bg: 'rgba(139, 92, 246, 0.2)',
    shadow_color: 'rgba(139, 92, 246, 0.15)'
  }
];

const DEFAULT_TIPS = [
  {
    id: 'TIP1',
    title: 'Managing Diabetes Daily',
    description: 'Simple dietary habits and glucose tracking tips from our senior pharmacist.',
    image_url: '/images/cat_diabetes.png',
    alt_text: 'Diabetes glucose checking',
    tag: 'Diabetes',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#ef4444',
    button_text: 'Read Guide',
    button_link: '/'
  },
  {
    id: 'TIP2',
    title: 'Boosting Immune Health',
    description: 'Essential multivitamins and natural boosters to strengthen your immune system.',
    image_url: '/images/cat_wellness.png',
    alt_text: 'Immune health products',
    tag: 'Immunity',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#10b981',
    button_text: 'Read Guide',
    button_link: '/'
  },
  {
    id: 'TIP3',
    title: 'Essential Pain Relief Care',
    description: 'How to manage joint pain and muscle pulls with proper topical treatments.',
    image_url: '/images/cat_medicines.png',
    alt_text: 'Pain relief gels and sprays',
    tag: 'Pain Care',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#f59e0b',
    button_text: 'Read Guide',
    button_link: '/'
  }
];

const DEFAULT_TESTIMONIALS = [
  {
    id: 'T1',
    name: 'Rajesh Kumar',
    rating: 5,
    comment: 'Uploading prescriptions was so easy. The Gachibowli store pharmacist verified it in 10 minutes, and I picked it up on my way home without waiting in queue!',
    role: 'Verified Patient',
    location: 'Gachibowli',
    category: 'Prescription Order',
    image_url: '/images/customer_1.png'
  },
  {
    id: 'T2',
    name: 'Priya Sharma',
    rating: 5,
    comment: 'I regularly order wellness and diabetes care products for my parents. SVMS is always fully stocked and their prices are very fair. The staff is extremely knowledgeable!',
    role: 'Regular Customer',
    location: 'Kondapur',
    category: 'Wellness Reservation',
    image_url: '/images/customer_2.png'
  },
  {
    id: 'T3',
    name: 'Vikram Aditya',
    rating: 5,
    comment: 'The online reservation system is outstanding. I reserved a pulse oximeter and nebulizer; they were packed and ready when I walked in. Exceptional store experience.',
    role: 'Tech Professional',
    location: 'Hitec City',
    category: 'Health Devices',
    image_url: '/images/customer_3.png'
  }
];

const DEFAULT_PHARMACIST_INFO = [
  {
    id: 'PH1',
    name: 'Consult a Pharmacist',
    role: 'Registered Pharmacist',
    description: 'Speak directly with our registered pharmacist regarding medicines, dosage, and prescription clarification.',
    image_url: '/images/rx_hero_pharmacist.png',
    button_text: 'Call Now',
    button_link: 'tel:+919876543210'
  }
];

const DEFAULT_BANNERS = {
  'upload-rx-bg': {
    banner_key: 'upload-rx-bg',
    title: 'Upload Prescription Banner BG',
    description: 'Dynamic background graphic for prescription section',
    image_url: '/images/rx_section_bg.png'
  }
};

const DEFAULT_BRANDS = [
  { id: 'B1', name: 'Cipla', badge: 'Trusted Worldwide', color: '#00529b', box_name: 'Paracetamol', box_sub: '500 mg Tablets', pack_class: 'cipla-para', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B2', name: 'Abbott', badge: 'Quality Assured', color: '#009FDF', box_name: 'SURE-D Z', box_sub: 'Multivitamins', pack_class: 'abbott-sure', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'] },
  { id: 'B3', name: 'Sun Pharma', badge: 'Trusted Quality', color: '#E65100', box_name: 'Levosalbutamol', box_sub: 'Sun Pharma', pack_class: 'sun-levo', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B4', name: 'Lupin', badge: 'Research Driven', color: '#2E7D32', box_name: 'Budecort', box_sub: 'Lupin', pack_class: 'lupin-bude', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B5', name: 'Glenmark', badge: 'Doctor Recommended', color: '#e11d48', box_name: 'Telma 40', box_sub: 'Glenmark', pack_class: 'glenmark-telma', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B6', name: 'GSK', badge: 'Innovation in Care', color: '#F05023', box_name: 'Citrazin', box_sub: 'Vitamin C', pack_class: 'gsk-citra', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'] },
  { id: 'B7', name: 'Pfizer', badge: 'Global Trusted Brand', color: '#00A3E0', box_name: 'Zithromax', box_sub: '250 mg Tablets', pack_class: 'pfizer-zithro', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] }
];

// Helper to query and sort table
async function queryCMSTable(tableName, defaultData) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (error) {
      console.warn(`[cmsService] Table "${tableName}" query error: ${error.message}. Using static fallbacks.`);
      return defaultData;
    }
    
    if (!data || data.length === 0) {
      return defaultData;
    }
    
    return data;
  } catch (err) {
    console.error(`[cmsService] Exception querying table "${tableName}":`, err);
    return defaultData;
  }
}

// ── CMS SERVICE IMPLEMENTATION ────────────────────────────────────────

export const cmsService = {
  getHeroSlides: async () => {
    return queryCMSTable('cms_hero', DEFAULT_HERO_SLIDES);
  },

  getCategories: async () => {
    return queryCMSTable('cms_categories', DEFAULT_CATEGORIES);
  },

  getQuickActions: async () => {
    return queryCMSTable('cms_quick_actions', DEFAULT_QUICK_ACTIONS);
  },

  getOffers: async () => {
    return queryCMSTable('cms_offers', DEFAULT_OFFERS);
  },

  getTips: async () => {
    return queryCMSTable('cms_tips', DEFAULT_TIPS);
  },

  getTestimonials: async () => {
    return queryCMSTable('cms_testimonials', DEFAULT_TESTIMONIALS);
  },

  getPharmacistInfo: async () => {
    return queryCMSTable('cms_pharmacist', DEFAULT_PHARMACIST_INFO);
  },

  getBrands: async () => {
    return queryCMSTable('cms_brands', DEFAULT_BRANDS);
  },

  getBanner: async (key) => {
    try {
      const { data, error } = await supabase
        .from('cms_banners')
        .select('*')
        .eq('banner_key', key)
        .eq('is_active', true)
        .limit(1)
        .single();
        
      if (error) {
        return DEFAULT_BANNERS[key] || null;
      }
      return data;
    } catch (err) {
      return DEFAULT_BANNERS[key] || null;
    }
  },

  getHomepageSections: async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[cmsService] Error fetching homepage sections:', err);
      return [];
    }
  },

  saveSectionDraft: async (key, draftConfig) => {
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .update({
          draft_config: draftConfig,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('section_key', key)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[cmsService] Error saving section draft:', err);
      throw err;
    }
  },

  publishSection: async (key, config) => {
    try {
      const { data: currentSec, error: getErr } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('section_key', key)
        .single();
      if (getErr) throw getErr;

      const updateData = {
        section_title: config.section_title || null,
        section_subtitle: config.section_subtitle || null,
        is_visible: config.is_visible !== undefined ? config.is_visible : true,
        display_order: config.display_order !== undefined ? config.display_order : 0,
        max_items: config.max_items !== undefined ? config.max_items : 6,
        layout_type: config.layout_type || 'grid',
        sort_type: config.sort_type || 'manual',
        mobile_layout: config.mobile_layout || 'carousel',
        desktop_layout: config.desktop_layout || 'grid',
        background_color: config.background_color || 'transparent',
        background_image_url: config.background_image_url || null,
        custom_css_class: config.custom_css_class || null,
        padding_top: config.padding_top !== undefined ? config.padding_top : 40,
        padding_bottom: config.padding_bottom !== undefined ? config.padding_bottom : 40,
        start_date: config.start_date || null,
        end_date: config.end_date || null,
        status: 'published',
        draft_config: null,
        updated_at: new Date().toISOString()
      };

      const { data: updatedSec, error: updateErr } = await supabase
        .from('homepage_sections')
        .update(updateData)
        .eq('section_key', key)
        .select()
        .single();
      if (updateErr) throw updateErr;

      const { data: versions } = await supabase
        .from('homepage_section_versions')
        .select('version_number')
        .eq('section_id', currentSec.id)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersionNum = versions && versions.length > 0 ? (versions[0].version_number + 1) : 1;

      await supabase
        .from('homepage_section_versions')
        .insert({
          section_id: currentSec.id,
          config: updateData,
          version_number: nextVersionNum
        });

      return updatedSec;
    } catch (err) {
      console.error('[cmsService] Error publishing section:', err);
      throw err;
    }
  },

  duplicateSection: async (key, newName) => {
    try {
      const { data: source, error: getErr } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('section_key', key)
        .single();
      if (getErr) throw getErr;

      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const newKey = `${source.section_key}_dup_${randomSuffix}`;

      const duplicateData = {
        section_key: newKey,
        section_name: newName,
        section_title: source.section_title,
        section_subtitle: source.section_subtitle,
        is_visible: false,
        display_order: source.display_order + 1,
        max_items: source.max_items,
        layout_type: source.layout_type,
        sort_type: source.sort_type,
        mobile_layout: source.mobile_layout,
        desktop_layout: source.desktop_layout,
        background_color: source.background_color,
        background_image_url: source.background_image_url,
        custom_css_class: source.custom_css_class,
        padding_top: source.padding_top,
        padding_bottom: source.padding_bottom,
        status: 'published'
      };

      const { data: created, error: createErr } = await supabase
        .from('homepage_sections')
        .insert([duplicateData])
        .select()
        .single();
      if (createErr) throw createErr;
      return created;
    } catch (err) {
      console.error('[cmsService] Error duplicating section:', err);
      throw err;
    }
  },

  getSectionVersions: async (sectionId) => {
    try {
      const { data, error } = await supabase
        .from('homepage_section_versions')
        .select('*')
        .eq('section_id', sectionId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[cmsService] Error getting section versions:', err);
      return [];
    }
  },

  restoreSectionVersion: async (key, versionConfig) => {
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .update({
          draft_config: versionConfig,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('section_key', key)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[cmsService] Error restoring section version:', err);
      throw err;
    }
  },

  incrementViews: async (key) => {
    try {
      const { error } = await supabase.rpc('increment_section_views', { sec_key: key });
      if (error) throw error;
    } catch (err) {
      console.warn(`[cmsService] Views count increment failed for ${key}:`, err.message);
    }
  },

  incrementClicks: async (key) => {
    try {
      const { error } = await supabase.rpc('increment_section_clicks', { sec_key: key });
      if (error) throw error;
    } catch (err) {
      console.warn(`[cmsService] Clicks count increment failed for ${key}:`, err.message);
    }
  },

  getFeaturedProductsConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_featured_products')
        .select('*')
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (err) {
      console.error('[cmsService] Error getting featured products config:', err);
      return null;
    }
  },

  updateFeaturedProductsConfig: async (config) => {
    try {
      const { data: existing } = await supabase
        .from('homepage_featured_products')
        .select('id')
        .limit(1);
      
      const id = existing && existing.length > 0 ? existing[0].id : '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabase
        .from('homepage_featured_products')
        .upsert({
          id,
          ...config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[cmsService] Error updating featured products config:', err);
      throw err;
    }
  },

  getFeaturedProductsItems: async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_featured_products_items')
        .select(`
          *,
          products (
            id,
            name,
            category,
            description,
            selling_price,
            stock_quantity,
            prescription_required,
            image_url,
            is_active,
            mrp
          )
        `)
        .order('display_order', { ascending: true });
      if (error) throw error;
      
      return (data || []).map(item => {
        const prod = item.products || {};
        return {
          id: item.id,
          product_id: item.product_id,
          name: item.title || prod.name || '',
          category: item.category || prod.category || '',
          description: item.short_description || prod.description || '',
          priceDiscounted: item.price !== null && item.price !== undefined ? Number(item.price) : Number(prod.selling_price || 0),
          priceOriginal: item.old_price !== null && item.old_price !== undefined ? Number(item.old_price) : Number(prod.mrp || 0),
          image: item.image_url || prod.image_url || '',
          display_order: item.display_order,
          is_active: item.is_active,
          is_featured: item.is_featured,
          stock_quantity: prod.stock_quantity || 0,
          prescription_required: prod.prescription_required || false,
          base_product: prod
        };
      });
    } catch (err) {
      console.error('[cmsService] Error getting featured product items:', err);
      return [];
    }
  },

  addFeaturedProduct: async (productId) => {
    try {
      const { data: existing } = await supabase
        .from('homepage_featured_products_items')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextOrder = existing && existing.length > 0 ? (existing[0].display_order + 1) : 0;
      
      const { data, error } = await supabase
        .from('homepage_featured_products_items')
        .insert({
          product_id: productId,
          display_order: nextOrder,
          is_active: true,
          is_featured: false
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[cmsService] Error adding featured product:', err);
      throw err;
    }
  },

  updateFeaturedProduct: async (itemId, updates) => {
    try {
      const { data, error } = await supabase
        .from('homepage_featured_products_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[cmsService] Error updating featured product item:', err);
      throw err;
    }
  },

  deleteFeaturedProduct: async (itemId) => {
    try {
      const { error } = await supabase
        .from('homepage_featured_products_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[cmsService] Error deleting featured product item:', err);
      throw err;
    }
  },

  processCMSItems: (items, config) => {
    if (!items || !Array.isArray(items)) return [];
    let processed = [...items];

    const sort = config?.sort_type || 'manual';
    if (sort === 'newest') {
      processed.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sort === 'oldest') {
      processed.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sort === 'alphabetical') {
      processed.sort((a, b) => {
        const nameA = (a.name || a.title || '').toLowerCase();
        const nameB = (b.name || b.title || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      processed.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }

    if (config?.max_items && config.max_items > 0) {
      processed = processed.slice(0, config.max_items);
    }

    return processed;
  }
};
