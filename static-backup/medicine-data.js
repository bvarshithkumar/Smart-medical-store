/**
 * medicine-data.js
 * Central data store for all medicines.
 * Used by both index.html product cards and medicine-detail.html.
 */
const MEDICINE_DB = {
    'dolo-650': {
        id: 'dolo-650',
        name: 'Dolo 650 Tablet',
        brand: 'Micro Labs',
        packInfo: 'Strip of 15 Tablets',
        priceOriginal: 35.30,
        priceDiscounted: 30.00,
        discountPercent: '15% OFF',
        stockStatus: 'instock',
        stockLabel: 'In Stock',
        isOTC: true,
        requiresPrescription: false,
        description: 'Dolo 650 Tablet is a common pain reliever and fever reducer. It contains Paracetamol 650mg as the active ingredient. It is used to relieve mild to moderate pain from headaches, toothaches, menstrual periods, colds, and fevers.',
        dosage: [
            'Adults: 1 tablet every 4–6 hours as needed',
            'Do not exceed 4 tablets (2600mg) in 24 hours',
            'Take with or without food',
            'Children under 12: consult your pharmacist',
        ],
        sideEffects: [
            'Nausea or stomach upset (rare)',
            'Skin rash or allergic reactions (rare)',
            'Liver damage if taken in excess doses',
            'Consult a doctor if symptoms persist beyond 3 days',
        ],
        storage: [
            'Store below 30°C in a cool, dry place',
            'Keep away from direct sunlight and moisture',
            'Keep out of reach of children',
            'Do not use after the expiry date printed on the pack',
        ],
        svgColor1: 'var(--primary-blue)',
        svgColor2: 'var(--teal-accent)',
        svg: `<svg viewBox="0 0 100 80" width="100%" height="100%">
            <rect x="15" y="15" width="70" height="50" rx="6" fill="#F0F4FA" stroke="var(--primary-blue)" stroke-width="2.5"/>
            <rect x="25" y="25" width="20" height="8" rx="2" fill="var(--primary-blue)" opacity="0.8"/>
            <circle cx="65" cy="40" r="10" fill="var(--teal-accent)" opacity="0.9"/>
            <line x1="60" y1="40" x2="70" y2="40" stroke="white" stroke-width="2"/>
            <line x1="65" y1="35" x2="65" y2="45" stroke="white" stroke-width="2"/>
            <line x1="25" y1="45" x2="45" y2="45" stroke="var(--text-light, #94A3B8)" stroke-width="2"/>
            <line x1="25" y1="52" x2="38" y2="52" stroke="var(--text-light, #94A3B8)" stroke-width="2"/>
        </svg>`,
        similar: ['vit-c-zinc', 'cough-syrup', 'pain-gel'],
        boughtTogether: ['vit-c-zinc', 'cough-syrup'],
    },

    'vit-c-zinc': {
        id: 'vit-c-zinc',
        name: 'Zincovit Multivitamins',
        brand: 'Abbott',
        packInfo: 'Bottle of 30 Tablets',
        priceOriginal: 150.00,
        priceDiscounted: 120.00,
        discountPercent: '20% OFF',
        stockStatus: 'instock',
        stockLabel: 'In Stock',
        isOTC: true,
        requiresPrescription: false,
        description: 'Zincovit is a comprehensive multivitamin and multimineral supplement. It contains a balanced combination of vitamins A, B-complex, C, D, E and minerals including zinc and selenium to support immunity, energy, and overall health.',
        dosage: [
            'Adults: 1 tablet daily after meals',
            'Best taken in the morning with breakfast',
            'Do not exceed recommended daily dose',
            'Consult a doctor for children\'s dosage',
        ],
        sideEffects: [
            'May cause mild stomach upset if taken on empty stomach',
            'Urine may appear bright yellow — this is normal (from B2)',
            'Excess Vitamin A may cause headaches if overdosed',
            'Consult a doctor if you are on blood thinners',
        ],
        storage: [
            'Store in a cool, dry place below 25°C',
            'Keep away from humidity and direct sunlight',
            'Replace cap tightly after use',
            'Keep out of reach of children',
        ],
        svg: `<svg viewBox="0 0 100 80" width="100%" height="100%">
            <rect x="30" y="10" width="40" height="60" rx="8" fill="#F0F6F5" stroke="var(--teal-accent)" stroke-width="2.5"/>
            <rect x="35" y="20" width="30" height="15" rx="3" fill="var(--teal-accent)" opacity="0.3"/>
            <rect x="38" y="25" width="24" height="5" rx="1" fill="var(--teal-accent)"/>
            <circle cx="50" cy="52" r="9" fill="#FF9800" opacity="0.9"/>
            <text x="46" y="56" fill="white" font-size="10" font-weight="bold">C</text>
        </svg>`,
        similar: ['dolo-650', 'pain-gel', 'cough-syrup'],
        boughtTogether: ['dolo-650', 'pain-gel'],
    },

    'cough-syrup': {
        id: 'cough-syrup',
        name: 'Kof-Kure Cough Syrup',
        brand: 'Kof-Kure Pharma',
        packInfo: 'Bottle of 100 ml',
        priceOriginal: 94.50,
        priceDiscounted: 85.00,
        discountPercent: '10% OFF',
        stockStatus: 'instock',
        stockLabel: 'In Stock',
        isOTC: true,
        requiresPrescription: false,
        description: 'Kof-Kure Cough Syrup provides fast relief from dry and wet cough. It contains a combination of Dextromethorphan (cough suppressant) and Guaifenesin (expectorant), helping clear mucus and soothe the throat.',
        dosage: [
            'Adults: 10 ml (2 teaspoons) every 6–8 hours',
            'Children 6–12 years: 5 ml every 6–8 hours',
            'Shake well before use',
            'Do not exceed 4 doses in 24 hours',
        ],
        sideEffects: [
            'Drowsiness or dizziness may occur',
            'Nausea or stomach discomfort (mild)',
            'Avoid alcohol while taking this syrup',
            'Do not drive or operate machinery after consumption',
        ],
        storage: [
            'Store at room temperature (below 30°C)',
            'Protect from light and excessive heat',
            'Discard unused portion after 30 days of opening',
            'Keep out of reach of children',
        ],
        svg: `<svg viewBox="0 0 100 80" width="100%" height="100%">
            <path d="M 40,15 L 60,15 L 60,25 C 60,25 70,30 70,40 L 70,70 L 30,70 L 30,40 C 30,30 40,25 40,25 Z" fill="#FDF3F5" stroke="#fc6076" stroke-width="2.5"/>
            <rect x="45" y="8" width="10" height="7" rx="1" fill="#fc6076"/>
            <rect x="36" y="38" width="28" height="22" rx="2" fill="#fc6076" opacity="0.2"/>
            <line x1="42" y1="48" x2="58" y2="48" stroke="#fc6076" stroke-width="2"/>
        </svg>`,
        similar: ['dolo-650', 'vit-c-zinc', 'pain-gel'],
        boughtTogether: ['dolo-650', 'vit-c-zinc'],
    },

    'pain-gel': {
        id: 'pain-gel',
        name: 'Relief-Max Pain Gel',
        brand: 'Relief-Max Therapeutics',
        packInfo: 'Tube of 30 gm',
        priceOriginal: 111.75,
        priceDiscounted: 95.00,
        discountPercent: '15% OFF',
        stockStatus: 'low',
        stockLabel: 'Only 2 left',
        isOTC: true,
        requiresPrescription: false,
        description: 'Relief-Max Pain Gel provides fast, targeted relief from muscle pain, joint pain, and sports injuries. It contains Diclofenac Sodium and Methyl Salicylate, which work together to reduce inflammation and numb localized pain.',
        dosage: [
            'Apply a thin layer to the affected area 2–3 times daily',
            'Gently massage until completely absorbed',
            'Wash hands after applying (unless treating hands)',
            'Do not apply to broken skin, wounds, or near eyes',
        ],
        sideEffects: [
            'Mild skin redness or warmth at application site',
            'Skin irritation or rash (stop use if this occurs)',
            'Avoid contact with eyes or mucous membranes',
            'Not recommended for children under 12 without medical advice',
        ],
        storage: [
            'Store below 25°C in a cool, dry place',
            'Keep cap tightly closed when not in use',
            'Do not expose to direct sunlight or extreme temperatures',
            'Keep out of reach of children',
        ],
        svg: `<svg viewBox="0 0 100 80" width="100%" height="100%">
            <path d="M 30,65 L 70,65 L 62,20 L 38,20 Z" fill="#F0FAF9" stroke="var(--primary-blue)" stroke-width="2.5"/>
            <rect x="44" y="12" width="12" height="8" rx="2" fill="var(--teal-accent)"/>
            <path d="M 36,40 Q 50,30 64,40" fill="none" stroke="var(--primary-blue)" stroke-width="3"/>
        </svg>`,
        similar: ['dolo-650', 'vit-c-zinc', 'cough-syrup'],
        boughtTogether: ['dolo-650', 'vit-c-zinc'],
    },
};

// Cart / Reservation Storage Helper
const ReservationCart = {
    getCart() {
        try {
            return JSON.parse(localStorage.getItem('reservation_cart')) || [];
        } catch (e) {
            return [];
        }
    },
    saveCart(cart) {
        localStorage.setItem('reservation_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));
    },
    addItem(id, qty = 1) {
        let cart = this.getCart();
        let itemIndex = cart.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            cart[itemIndex].qty += parseInt(qty) || 1;
        } else {
            cart.push({ id, qty: parseInt(qty) || 1 });
        }
        this.saveCart(cart);
    },
    updateQty(id, qty) {
        let cart = this.getCart();
        let itemIndex = cart.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            if (qty <= 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].qty = parseInt(qty) || 1;
            }
            this.saveCart(cart);
        }
    },
    removeItem(id) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== id);
        this.saveCart(cart);
    },
    getCartCount() {
        return this.getCart().reduce((sum, item) => sum + item.qty, 0);
    },
    clearCart() {
        localStorage.removeItem('reservation_cart');
        window.dispatchEvent(new Event('cart-updated'));
    }
};
