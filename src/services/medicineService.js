import { supabase } from '../lib/supabase';

// Map database product rows to the detailed format expected by the frontend
export const DOLO_UUID = 'd0106500-0000-4000-a000-000000000001';
export const ZINCOVIT_UUID = 'c00cc000-0000-4000-a000-000000000002';
export const COUGH_UUID = 'c0066550-0000-4000-a000-000000000003';
export const PAIN_UUID = 'fa1106e1-0000-4000-a000-000000000004';

// Map database product rows to the detailed format expected by the frontend
export const mapProduct = (p) => {
  if (!p) return null;
  
  const sellingPrice = p.selling_price || p.price || 0;
  const mrp = p.mrp || Math.round(sellingPrice * 1.2 * 100) / 100;
  
  let discountPercentage = 0;
  if (mrp > 0 && sellingPrice > 0 && mrp > sellingPrice) {
    discountPercentage = Math.round(((mrp - sellingPrice) / mrp) * 100);
  }
  const discountPercent = discountPercentage > 0 ? `${discountPercentage}% OFF` : '';

  // Map to visual components
  let brand = p.brand || 'Generic Brand';
  let packInfo = 'Strip of 15 Tablets';
  let similar = [];
  let boughtTogether = [];

  if (p.id === DOLO_UUID) {
    if (!p.brand) brand = 'Micro Labs';
    packInfo = 'Strip of 15 Tablets';
    similar = [ZINCOVIT_UUID, COUGH_UUID, PAIN_UUID];
    boughtTogether = [ZINCOVIT_UUID, COUGH_UUID];
  } else if (p.id === ZINCOVIT_UUID) {
    if (!p.brand) brand = 'Abbott';
    packInfo = 'Bottle of 30 Tablets';
    similar = [DOLO_UUID, PAIN_UUID, COUGH_UUID];
    boughtTogether = [DOLO_UUID, PAIN_UUID];
  } else if (p.id === COUGH_UUID) {
    if (!p.brand) brand = 'Kof-Kure Pharma';
    packInfo = 'Bottle of 100 ml';
    similar = [DOLO_UUID, ZINCOVIT_UUID, PAIN_UUID];
    boughtTogether = [DOLO_UUID, ZINCOVIT_UUID];
  } else if (p.id === PAIN_UUID) {
    if (!p.brand) brand = 'Relief-Max Therapeutics';
    packInfo = 'Tube of 30 gm';
    similar = [DOLO_UUID, ZINCOVIT_UUID, COUGH_UUID];
    boughtTogether = [DOLO_UUID, ZINCOVIT_UUID];
  }

  return {
    id: p.id,
    name: p.name,
    brand,
    genericName: p.generic_name || p.name,
    generic_name: p.generic_name || p.name,
    manufacturer: p.manufacturer || 'Venkateshwara Pharma',
    sku: p.sku || '',
    batchNo: p.batch_no || p.batch_number || 'B-GEN999',
    batch_no: p.batch_no || p.batch_number || 'B-GEN999',
    expiryDate: p.expiry_date || '',
    expiry_date: p.expiry_date || '',
    reorderLevel: p.reorder_level || 10,
    reorder_level: p.reorder_level || 10,
    packInfo,
    mrp,
    selling_price: sellingPrice,
    price: sellingPrice, // Compatibility
    priceOriginal: mrp, // Compatibility
    priceDiscounted: sellingPrice, // Compatibility
    discount: discountPercentage, // Compatibility for admin
    discountPercentage,
    discountPercent,
    stock: p.stock_quantity ?? 100, // Compatibility for admin
    stock_quantity: p.stock_quantity ?? 100,
    stockStatus: (p.stock_quantity ?? 100) === 0 ? 'outofstock' : 'instock',
    stockLabel: (p.stock_quantity ?? 100) === 0 ? 'Out of Stock' : 'In Stock',
    isOTC: !p.prescription_required,
    requiresPrescription: !!p.prescription_required,
    prescriptionRequired: !!p.prescription_required, // Compatibility for admin
    prescription_required: !!p.prescription_required, // Direct mapping
    is_active: p.is_active ?? true, // Direct mapping
    description: p.description || '',
    dosage: [
      'Adults: 1 unit as needed',
      'Take with or without food',
      'Keep out of reach of children',
      'Consult your pharmacist for children\'s dosage'
    ],
    sideEffects: [
      'Mild stomach discomfort (rare)',
      'Consult a doctor if symptoms persist'
    ],
    storage: [
      'Store in a cool, dry place',
      'Keep away from direct sunlight'
    ],
    image: p.image_url || '/images/cat_medicines.png',
    image_url: p.image_url || '/images/cat_medicines.png', // Direct mapping
    images: (() => {
      if (!p.image_url || p.image_url.trim() === '' || p.image_url === '/images/cat_medicines.png') {
        return [];
      }
      const val = p.image_url.trim();
      if (val.startsWith('[')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch (e) {
          // ignore parsing error
        }
      }
      return val.split(',').map(url => url.trim()).filter(Boolean);
    })(),
    similar,
    boughtTogether,
    category: p.category
  };
};

const DEFAULT_MEDICINES = [
  {
    id: DOLO_UUID,
    name: 'Dolo 650 Tablet',
    category: 'Fever & Pain',
    description: 'Dolo 650 Tablet is a common pain reliever and fever reducer. It contains Paracetamol 650mg as the active ingredient. It is used to relieve mild to moderate pain from headaches, toothaches, menstrual periods, colds, and fevers.',
    selling_price: 30.00,
    mrp: 35.00,
    stock_quantity: 100,
    prescription_required: false,
    image_url: '/images/dolo 650 tablet image.png'
  },
  {
    id: ZINCOVIT_UUID,
    name: 'Zincovit Multivitamins',
    category: 'Vitamins',
    description: 'Zincovit is a comprehensive multivitamin and multimineral supplement. It contains a balanced combination of vitamins A, B-complex, C, D, E and minerals including zinc and selenium to support immunity, energy, and overall health.',
    selling_price: 120.00,
    mrp: 150.00,
    stock_quantity: 80,
    prescription_required: false,
    image_url: '/images/Zincovit tablet image.png'
  },
  {
    id: COUGH_UUID,
    name: 'Kof-Kure Cough Syrup',
    category: 'Respiratory',
    description: 'Kof-Kure Cough Syrup provides fast relief from dry and wet cough. It contains a combination of Dextromethorphan (cough suppressant) and Guaifenesin (expectorant), helping clear mucus and soothe the throat.',
    selling_price: 85.00,
    mrp: 110.00,
    stock_quantity: 60,
    prescription_required: false,
    image_url: '/images/kuf-kure syrup image.png'
  },
  {
    id: PAIN_UUID,
    name: 'Relief-Max Pain Gel',
    category: 'Personal Care',
    description: 'Relief-Max Pain Gel provides fast, targeted relief from muscle pain, joint pain, and sports injuries. It contains Diclofenac Sodium and Methyl Salicylate, which work together to reduce inflammation and numb localized pain.',
    selling_price: 95.00,
    mrp: 125.00,
    stock_quantity: 40,
    prescription_required: false,
    image_url: '/images/Relief max image.png'
  }
];

export const medicineService = {
  getMedicines: async () => {
    let { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Error fetching medicines:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No products found. Seeding default products...');
      const { error: seedError } = await supabase.from('products').insert(DEFAULT_MEDICINES);
      if (seedError) {
        console.error('Error seeding products:', seedError);
        return [];
      }
      const { data: seededData } = await supabase.from('products').select('*');
      data = seededData || [];
    }

    return data.map(mapProduct);
  },

  getMedicineById: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error(`Error fetching medicine ${id}:`, error);
      return null;
    }
    return mapProduct(data);
  },

  getSimilarMedicines: async (id) => {
    const med = await medicineService.getMedicineById(id);
    if (!med) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', med.category)
      .neq('id', id)
      .limit(3);

    if (error || !data || data.length === 0) {
      // Fallback: get any other 3 products
      const { data: fallbackData } = await supabase
        .from('products')
        .select('*')
        .neq('id', id)
        .limit(3);
      return (fallbackData || []).map(mapProduct);
    }
    return data.map(mapProduct);
  },

  getBoughtTogether: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .neq('id', id)
      .limit(2);

    if (error || !data) return [];
    return data.map(mapProduct);
  }
};