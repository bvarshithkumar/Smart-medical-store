// ============================================================
// SVMS Admin Panel – Mock Data Layer
// Swap these functions for real API calls (Supabase/Firebase)
// ============================================================

export const ADMIN_CREDENTIALS = {
  email: 'admin@svms.com',
  password: 'Admin@1234',
  name: 'Store Admin',
  role: 'Super Admin',
  avatar: 'A',
};

/// ── Products ────────────────────────────────────────────────
export const mockProducts = [];

export const CATEGORIES = ['All', 'Fever & Pain', 'Antibiotics', 'Vitamins', 'Diabetes', 'Gastro', 'Cardiac', 'Allergy', 'Respiratory', 'Neuro', 'Personal Care'];

// ── Orders ──────────────────────────────────────────────────
export const mockOrders = [];

// ── Customers ────────────────────────────────────────────────
export const mockCustomers = [];

// ── Prescriptions ────────────────────────────────────────────
export const mockPrescriptions = [];

// ── Inventory ────────────────────────────────────────────────
export const mockInventory = [];

export const mockInventoryLogs = [];

// ── Coupons ──────────────────────────────────────────────────
export const mockCoupons = [];

// ── Notifications ────────────────────────────────────────────
export const mockNotifications = [];

// ── Activity Logs ────────────────────────────────────────────
export const mockActivityLogs = [];

// ── CMS Data ─────────────────────────────────────────────────
export const mockCMSData = {
  heroSlides: [
    { id: 'HS1', heading: 'Your Trusted Pharmacy', subheading: 'Genuine medicines, delivered with care', btnText: 'Shop Now', btnLink: '/', active: true },
    { id: 'HS2', heading: 'Upload Your Prescription', subheading: 'Quick & easy prescription processing', btnText: 'Upload Now', btnLink: '/', active: true },
    { id: 'HS3', heading: 'Flash Sale – Up to 25% Off', subheading: 'On selected OTC products this week', btnText: 'View Offers', btnLink: '/', active: false },
  ],
  categories: [
    { id: 'CAT1', name: 'Fever & Pain', icon: '🌡️', active: true },
    { id: 'CAT2', name: 'Vitamins', icon: '💊', active: true },
    { id: 'CAT3', name: 'Cardiac', icon: '❤️', active: true },
    { id: 'CAT4', name: 'Diabetes', icon: '🩸', active: true },
    { id: 'CAT5', name: 'Allergy', icon: '🌿', active: true },
  ],
  offers: [],
  testimonials: [],
  faqs: [
    { id: 'F1', question: 'Do you deliver medicines at home?', answer: 'Currently we offer scheduled pickup from the store. Home delivery coming soon.', active: true },
    { id: 'F2', question: 'Can I upload a prescription online?', answer: 'Yes! You can upload your prescription through our website and we\'ll have it ready for pickup.', active: true },
    { id: 'F3', question: 'What are your store timings?', answer: 'We are open Mon–Sat: 8 AM – 10 PM, Sunday: 9 AM – 8 PM.', active: true },
  ],
  blogs: [],
};

// ── Revenue Chart Data ────────────────────────────────────────
export const revenueData = {
  '7d': [],
  '30d': [],
  '90d': [],
};

// ── Settings ──────────────────────────────────────────────────
export const defaultSettings = {
  storeName: 'Sri Venkateshwara Medical & General Stores',
  address: 'Shop No. 12, Kavuri Hills, Gachibowli, Hyderabad – 500033',
  phone: '+91 99891 78696',
  whatsapp: '+91 99891 78696',
  email: 'svms@example.com',
  openTime: '08:00',
  closeTime: '22:00',
  sundayOpen: '09:00',
  sundayClose: '20:00',
  minOrderValue: 100,
  facebook: 'https://facebook.com/svms',
  instagram: 'https://instagram.com/svms',
  twitter: '',
  youtube: '',
};
