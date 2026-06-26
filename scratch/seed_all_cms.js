import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

const HERO_SLIDES = [
  {
    tag: 'Prescription Upload 📄',
    title: 'Upload Prescription',
    title_highlight: 'Reviewed by Licensed Pharmacists',
    description: 'Upload your prescription securely. Our licensed pharmacists review it, prepare the required medicines, and notify you when they are ready for pickup.',
    image_url: '/images/hero_upload_scene.png',
    button_text: 'Upload Prescription',
    button_link: 'upload',
    display_order: 0,
    bg_gradient: 'linear-gradient(135deg, #022C22 0%, #042F2E 60%, #0F766E 100%)',
    features: ['Licensed Pharmacist Review', '15 Minute Review', 'Secure Upload'],
    tag_style: { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.25)', color: '#14b8a6' }
  },
  {
    tag: 'Express Reservation ⚡',
    title: 'Reserve Medicines Online',
    title_highlight: 'Ready in 15 Minutes',
    description: 'Reserve medicines instantly and collect them from the store without waiting.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Reserve Medicines',
    button_link: 'shop',
    display_order: 1,
    bg_gradient: 'linear-gradient(135deg, #091E3A 0%, #0A2E5C 60%, #1E40AF 100%)',
    features: ['Fast Reservation', 'Real-Time Availability', 'Quick Collection'],
    tag_style: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa' }
  },
  {
    tag: 'Genuine Guarantee 🛡️',
    title: '100% Genuine Medicines',
    title_highlight: 'Certified & Trusted Stock',
    description: 'Medicines sourced directly from verified pharmaceutical suppliers.',
    image_url: '/images/hero_genuine_scene.png',
    button_text: 'Explore Medicines',
    button_link: 'shop',
    display_order: 2,
    bg_gradient: 'linear-gradient(135deg, #1E1B4B 0%, #311042 60%, #581C87 100%)',
    features: ['Verified Suppliers', 'Quality Assured', 'Trusted Brands'],
    tag_style: { bg: 'rgba(124, 92, 246, 0.12)', border: 'rgba(124, 92, 246, 0.25)', color: '#a78bfa' }
  },
  {
    tag: 'Expert Advice 💬',
    title: 'Talk To Pharmacist',
    title_highlight: 'Expert Guidance & Assistance',
    description: 'Get help from licensed pharmacists regarding medicines, dosage, and prescription clarification.',
    image_url: '/images/rx_hero_pharmacist.png',
    button_text: 'Ask Pharmacist',
    button_link: 'pharmacist',
    display_order: 3,
    bg_gradient: 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)',
    features: ['Licensed Pharmacists', 'Expert Advice', 'Quick Support'],
    tag_style: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', color: '#f472b6' }
  },
  {
    tag: 'Scheduled Pickup 🕐',
    title: 'Schedule Pickup',
    title_highlight: 'Convenient Collection Experience',
    description: 'Choose a pickup time that suits you and collect medicines quickly.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Schedule Pickup',
    button_link: 'pickup',
    display_order: 4,
    bg_gradient: 'linear-gradient(135deg, #2c1d11 0%, #3d2208 60%, #b45309 100%)',
    features: ['Flexible Timing', 'Fast Collection', 'Easy Scheduling'],
    tag_style: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
  }
];

const CATEGORIES = [
  { name: 'Medicines', color: '#00A884', image_url: '/images/cat_medicines.png', product_count: '1,200+ Products', display_order: 0 },
  { name: 'Wellness', color: '#00a896', image_url: '/images/cat_wellness.png', product_count: '850+ Products', display_order: 1 },
  { name: 'Personal Care', color: '#ea580c', image_url: '/images/cat_personal.png', product_count: '640+ Products', display_order: 2 },
  { name: 'Health Devices', color: '#3b82f6', image_url: '/images/cat_devices.png', product_count: '250+ Products', display_order: 3 },
  { name: 'Diabetes Care', color: '#ef4444', image_url: '/images/cat_diabetes.png', product_count: '420+ Products', display_order: 4 },
  { name: 'Baby Care', color: '#8b5cf6', image_url: '/images/cat_baby.png', product_count: '380+ Products', display_order: 5 }
];

const QUICK_ACTIONS = [
  { title: 'Schedule Pickup', description: 'Ready at Gachibowli store', badge: 'Fast Pickup', image_url: '/images/action_pickup.png', button_link: '/pickup', display_order: 0 },
  { title: 'Upload Prescription', description: 'Pharmacist verified in mins', badge: 'Instant Review', image_url: '/images/action_upload.png', button_link: 'upload', display_order: 1 },
  { title: 'Repeat Order', description: 'Reorder chronic medicines', badge: 'Easy Reorder', image_url: '/images/action_repeat.png', button_link: 'repeat', display_order: 2 },
  { title: 'Talk to Pharmacist', description: 'Free healthcare assistance', badge: 'Consult Free', image_url: '/images/action_pharmacist.png', button_link: 'pharmacist', display_order: 3 }
];

const OFFERS = [
  {
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
    shadow_color: 'rgba(2, 132, 199, 0.15)',
    display_order: 0
  },
  {
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
    shadow_color: 'rgba(139, 92, 246, 0.15)',
    display_order: 1
  }
];

const TIPS = [
  {
    title: 'Managing Diabetes Daily',
    description: 'Simple dietary habits and glucose tracking tips from our senior pharmacist.',
    image_url: '/images/cat_diabetes.png',
    alt_text: 'Diabetes glucose checking',
    tag: 'Diabetes',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#ef4444',
    button_text: 'Read Guide',
    button_link: '/',
    display_order: 0
  },
  {
    title: 'Boosting Immune Health',
    description: 'Essential multivitamins and natural boosters to strengthen your immune system.',
    image_url: '/images/cat_wellness.png',
    alt_text: 'Immune health products',
    tag: 'Immunity',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#10b981',
    button_text: 'Read Guide',
    button_link: '/',
    display_order: 1
  },
  {
    title: 'Essential Pain Relief Care',
    description: 'How to manage joint pain and muscle pulls with proper topical treatments.',
    image_url: '/images/cat_medicines.png',
    alt_text: 'Pain relief gels and sprays',
    tag: 'Pain Care',
    bg_color: 'linear-gradient(to right, #0b1528, #0e1e38)',
    tag_color: '#f59e0b',
    button_text: 'Read Guide',
    button_link: '/',
    display_order: 2
  }
];

const TESTIMONIALS = [
  {
    name: 'Rajesh Kumar',
    rating: 5,
    comment: 'Uploading prescriptions was so easy. The Gachibowli store pharmacist verified it in 10 minutes, and I picked it up on my way home without waiting in queue!',
    role: 'Verified Patient',
    location: 'Gachibowli',
    category: 'Prescription Order',
    image_url: '/images/customer_1.png',
    display_order: 0
  },
  {
    name: 'Priya Sharma',
    rating: 5,
    comment: 'I regularly order wellness and diabetes care products for my parents. SVMS is always fully stocked and their prices are very fair. The staff is extremely knowledgeable!',
    role: 'Regular Customer',
    location: 'Kondapur',
    category: 'Wellness Reservation',
    image_url: '/images/customer_2.png',
    display_order: 1
  },
  {
    name: 'Vikram Aditya',
    rating: 5,
    comment: 'The online reservation system is outstanding. I reserved a pulse oximeter and nebulizer; they were packed and ready when I walked in. Exceptional store experience.',
    role: 'Tech Professional',
    location: 'Hitec City',
    category: 'Health Devices',
    image_url: '/images/customer_3.png',
    display_order: 2
  }
];

const PHARMACIST_INFO = [
  {
    name: 'Consult a Pharmacist',
    role: 'Registered Pharmacist',
    description: 'Speak directly with our registered pharmacist regarding medicines, dosage, and prescription clarification.',
    image_url: '/images/rx_hero_pharmacist.png',
    button_text: 'Call Now',
    button_link: 'tel:+919876543210',
    display_order: 0
  }
];

const BANNERS = [
  {
    banner_key: 'upload-rx-bg',
    title: 'Upload Prescription Banner BG',
    description: 'Dynamic background graphic for prescription section',
    image_url: '/images/rx_section_bg.png',
    display_order: 0
  }
];

const BRANDS = [
  { name: 'Cipla', badge: 'Trusted Worldwide', color: '#00529b', box_name: 'Paracetamol', box_sub: '500 mg Tablets', pack_class: 'cipla-para', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], display_order: 0 },
  { name: 'Abbott', badge: 'Quality Assured', color: '#009FDF', box_name: 'SURE-D Z', box_sub: 'Multivitamins', pack_class: 'abbott-sure', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'], display_order: 1 },
  { name: 'Sun Pharma', badge: 'Trusted Quality', color: '#E65100', box_name: 'Levosalbutamol', box_sub: 'Sun Pharma', pack_class: 'sun-levo', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], display_order: 2 },
  { name: 'Lupin', badge: 'Research Driven', color: '#2E7D32', box_name: 'Budecort', box_sub: 'Lupin', pack_class: 'lupin-bude', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], display_order: 3 },
  { name: 'Glenmark', badge: 'Doctor Recommended', color: '#e11d48', box_name: 'Telma 40', box_sub: 'Glenmark', pack_class: 'glenmark-telma', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], display_order: 4 },
  { name: 'GSK', badge: 'Innovation in Care', color: '#F05023', box_name: 'Citrazin', box_sub: 'Vitamin C', pack_class: 'gsk-citra', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'], display_order: 5 },
  { name: 'Pfizer', badge: 'Global Trusted Brand', color: '#00A3E0', box_name: 'Zithromax', box_sub: '250 mg Tablets', pack_class: 'pfizer-zithro', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], display_order: 6 }
];

async function seed() {
  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  const SEEDS = [
    { table: 'cms_hero', data: HERO_SLIDES },
    { table: 'cms_categories', data: CATEGORIES },
    { table: 'cms_quick_actions', data: QUICK_ACTIONS },
    { table: 'cms_offers', data: OFFERS },
    { table: 'cms_tips', data: TIPS },
    { table: 'cms_testimonials', data: TESTIMONIALS },
    { table: 'cms_pharmacist', data: PHARMACIST_INFO },
    { table: 'cms_banners', data: BANNERS },
    { table: 'cms_brands', data: BRANDS }
  ];

  for (const item of SEEDS) {
    console.log(`Seeding table: ${item.table}...`);
    
    // First, delete existing items to prevent duplicates or clean up 1-item limits
    const { error: delError } = await supabase.from(item.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) {
      console.warn(`Warning deleting rows from ${item.table}:`, delError.message);
    }
    
    const { data, error } = await supabase.from(item.table).insert(item.data).select();
    if (error) {
      console.error(`Error seeding ${item.table}:`, error.message);
    } else {
      console.log(`Successfully seeded ${item.table}. Inserted rows: ${data.length}`);
    }
  }
}

seed();
