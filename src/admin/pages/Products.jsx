import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Plus, Search, Edit2, Trash2, Copy, X, AlertTriangle, Upload, Loader2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonGrid, ErrorState } from '../../components/LoadingStates';

const EMPTY_PRODUCT = {
  name: '', category: 'Fever & Pain', brand: '', description: '',
  price: '', mrp: '', discount: 0, stock: '',
  prescriptionRequired: false, featured: false, sku: '',
  genericName: '', manufacturer: '', batchNo: '', expiryDate: '', reorderLevel: 10,
  image_url: '', image: ''
};

// SheetJS loader helper
const loadSheetJS = () => {
  return new Promise((resolve) => {
    if (window.XLSX) {
      resolve(window.XLSX);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    document.head.appendChild(script);
  });
};

// CSV parsing helper
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  const result = [];
  if (lines.length === 0 || !lines[0]) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index]?.replace(/^"|"$/g, '') || '';
    });
    result.push(obj);
  }
  return result;
};

// Image compression helper
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', 0.7);
      };
    };
  });
};

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct, CATEGORIES, dataLoading, dataError, refetchAllData } = useAdmin();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState({ valid: [], invalid: [] });

  const PER_PAGE = 12;

  if (dataLoading && products.length === 0) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Products</h1><p>Loading products…</p></div>
        </div>
        <SkeletonGrid cards={9} minWidth={220} />
      </AdminLayout>
    );
  }

  if (dataError) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Products</h1></div>
        </div>
        <ErrorState message={dataError} onRetry={refetchAllData} />
      </AdminLayout>
    );
  }

  // Handle standard image uploads & drag-drops
  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filepath = `products/${filename}`;

      const { data, error } = await supabase.storage
        .from('cms-assets')
        .upload(filepath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('cms-assets')
        .getPublicUrl(filepath);

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

      setForm(prev => ({
        ...prev,
        image_url: urlData.publicUrl,
        image: urlData.publicUrl
      }));
    } catch (err) {
      console.error('[Products Admin] Image upload error:', err);
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    await uploadImage(compressed);
  };

  // Image deletion from storage helper
  const deleteImageFromStorage = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('cms-assets')) return;
    try {
      const parts = imageUrl.split('/cms-assets/');
      if (parts[1]) {
        const filepath = parts[1];
        await supabase.storage.from('cms-assets').remove([filepath]);
      }
    } catch (err) {
      console.error('[Products Admin] Storage cleanup failed:', err);
    }
  };

  // Pricing calculations
  const handlePriceChange = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      const price = +updated.price || 0;
      const mrp = +updated.mrp || 0;
      if (mrp > 0 && mrp > price) {
        updated.discount = Math.round(((mrp - price) / mrp) * 100);
      } else {
        updated.discount = 0;
      }
      return updated;
    });
  };

  // Filters logic
  const filtered = products.filter(p => {
    const sTerm = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(sTerm) ||
      (p.brand && p.brand.toLowerCase().includes(sTerm)) ||
      (p.genericName && p.genericName.toLowerCase().includes(sTerm)) ||
      (p.sku && p.sku.toLowerCase().includes(sTerm));
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchStock = stockFilter === 'All'
      ? true 
      : stockFilter === 'Low' ? (p.stock > 0 && p.stock <= (p.reorderLevel || 10))
      : stockFilter === 'Out' ? p.stock === 0 
      : p.stock > (p.reorderLevel || 10);
    return matchSearch && matchCat && matchStock;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => {
    console.log("Add Product clicked - Opening modal");
    setForm(EMPTY_PRODUCT);
    setModal('add');
  };
  const openEdit = (p) => {
    console.log("Edit clicked - Opening modal", p);
    setForm({ ...p });
    setSelected(p);
    setModal('edit');
  };
  const openDelete = (p) => {
    console.log("Delete clicked - Opening modal", p);
    setSelected(p);
    setModal('delete');
  };
  const closeModal = () => {
    console.log("Closing modal and resetting selected product");
    setModal(null);
    setSelected(null);
  };

  // Validation & Saving
  const handleSave = async () => {
    if (!form.name || !form.name.trim()) {
      alert('Product Name is required.');
      return;
    }
    if (!form.price || +form.price <= 0) {
      alert('Selling Price must be greater than 0.');
      return;
    }
    if (form.stock === '' || +form.stock < 0) {
      alert('Stock Quantity cannot be negative.');
      return;
    }
    if (form.expiryDate) {
      const exp = new Date(form.expiryDate);
      if (isNaN(exp.getTime())) {
        alert('Please enter a valid Expiry Date.');
        return;
      }
    }

    const enteredSku = (form.sku || '').trim();
    if (enteredSku) {
      const isDuplicate = products.some(p => 
        p.sku && p.sku.toLowerCase() === enteredSku.toLowerCase() && p.id !== selected?.id
      );
      if (isDuplicate) {
        alert(`SKU "${enteredSku}" is already assigned to another product.`);
        return;
      }
    }

    const data = { 
      ...form, 
      price: +form.price, 
      mrp: +form.mrp || +form.price, 
      discount: +form.discount || 0, 
      stock: +form.stock || 0,
      reorderLevel: +form.reorderLevel || 10
    };

    let res;
    if (modal === 'add') {
      res = await addProduct(data);
    } else if (modal === 'edit' && selected) {
      res = await updateProduct(selected.id, data);
    }

    if (res?.success) {
      alert(modal === 'add' ? 'Product added successfully!' : 'Product updated successfully!');
      closeModal();
    } else {
      alert('Save operation failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (selected) {
      const imageToDelete = selected.image_url || selected.image;
      const res = await deleteProduct(selected.id);
      if (res?.success) {
        if (imageToDelete) {
          await deleteImageFromStorage(imageToDelete);
        }
        alert('Product deleted successfully.');
      } else {
        alert('Failed to delete product: ' + (res?.error || 'Unknown error'));
      }
    }
    closeModal();
  };

  const duplicate = async (p) => {
    console.log("Copy clicked - Duplicating product", p);
    const newSku = `SKU-${(p.name || 'MED').substring(0,3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const duplicatedData = {
      ...p,
      name: `${p.name} (Copy)`,
      sku: newSku,
      id: undefined
    };
    const res = await addProduct(duplicatedData);
    if (res?.success) {
      console.log("Product duplicated successfully");
      alert('Product duplicated successfully!');
    } else {
      console.error("Duplicate product failed error payload:", res?.error);
      alert('Failed to duplicate product: ' + (res?.error || 'Unknown database constraint error occurred'));
    }
  };

  const stockBadge = (s, rl = 10) => s === 0 ? 'badge-out-stock' : s <= rl ? 'badge-low-stock' : 'badge-in-stock';
  const stockLabel = (s, rl = 10) => s === 0 ? 'Out of Stock' : s <= rl ? 'Low Stock' : 'In Stock';

  // Bulk Upload operations
  const processParsedData = (rows) => {
    const valid = [];
    const invalid = [];

    rows.forEach((row, index) => {
      const getVal = (keys) => {
        for (const key of keys) {
          const found = Object.keys(row).find(k => k.trim().toLowerCase().replace(/\s+|_/g, '') === key.toLowerCase().replace(/\s+|_/g, ''));
          if (found) return row[found];
        }
        return '';
      };

      const name = getVal(['Product Name', 'ProductName', 'Name']);
      const genericName = getVal(['Generic Name', 'GenericName', 'Generic']);
      const brand = getVal(['Brand']);
      const category = getVal(['Category']);
      const mrp = +getVal(['MRP']) || 0;
      const sellingPrice = +getVal(['Selling Price', 'SellingPrice', 'Price']) || 0;
      const stock = +getVal(['Stock', 'Stock Quantity', 'StockQuantity', 'Quantity']) || 0;
      const manufacturer = getVal(['Manufacturer']);
      const batchNo = getVal(['Batch Number', 'BatchNumber', 'BatchNo']);
      const expiryDate = getVal(['Expiry Date', 'ExpiryDate', 'Expiry']);
      const description = getVal(['Description']);
      const imageUrl = getVal(['Image URL', 'ImageURL', 'Image']);

      const errors = [];
      if (!name) errors.push('Product Name is empty');
      if (sellingPrice <= 0) errors.push('Selling Price must be > 0');
      if (stock < 0) errors.push('Stock cannot be negative');

      const item = {
        name,
        genericName,
        brand: brand || 'Generic Brand',
        category: category || 'Fever & Pain',
        mrp: mrp || Math.round(sellingPrice * 1.2),
        price: sellingPrice,
        stock: stock || 0,
        manufacturer: manufacturer || 'Venkateshwara Pharma',
        batchNo: batchNo || 'B-GEN999',
        expiryDate: expiryDate || null,
        description: description || '',
        image: imageUrl || '',
        sku: `SKU-${(name || 'MED').substring(0,3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`
      };

      if (errors.length > 0) {
        invalid.push({ rowNumber: index + 2, item, reason: errors.join(', ') });
      } else {
        valid.push(item);
      }
    });

    setImportData({ valid, invalid });
  };

  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const extension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    
    if (extension === 'csv') {
      reader.onload = (event) => {
        processParsedData(parseCSV(event.target.result));
      };
      reader.readAsText(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      try {
        const XLSX = await loadSheetJS();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          processParsedData(json);
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        alert('Failed to load Excel reader: ' + err.message);
      }
    } else {
      alert('Unsupported file format. Please upload CSV or Excel (.xlsx) files.');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Product Name", "Generic Name", "Brand", "Category", 
      "MRP", "Selling Price", "Stock", "Manufacturer", 
      "Batch Number", "Expiry Date", "Description", "Image URL"
    ];
    const sampleRow = [
      "Paracetamol 650mg", "Paracetamol", "Micro Labs", "Fever & Pain",
      "35", "30", "100", "Micro Labs",
      "B-PAR101", "2027-12-31", "Fast acting fever reducer", ""
    ];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFailedRows = () => {
    if (importData.invalid.length === 0) return;
    const headers = ['Row Number', 'Product Name', 'Error Reason'];
    const rows = importData.invalid.map(inv => [
      inv.rowNumber,
      `"${inv.item.name || ''}"`,
      `"${inv.reason}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "failed_import_rows.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeBulkImport = async () => {
    if (importData.valid.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const item of importData.valid) {
      const res = await addProduct(item);
      if (res?.success) successCount++;
      else failCount++;
    }
    
    alert(`Bulk import complete!\nSuccessfully imported: ${successCount}\nFailed: ${failCount}`);
    setImportData({ valid: [], invalid: [] });
    setBulkModalOpen(false);
    setIsImporting(false);
  };

  const ProductModal = () => (
    <div className="modal-overlay" onClick={closeModal} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{modal === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
            <p>Fill in the product details below</p>
          </div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>
        <div className="modal-body" style={{ gap: 14 }}>
          
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>Basic Information</h3>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dolo 650 Tablet" />
            </div>
            <div className="form-group">
              <label className="form-label">Generic Name</label>
              <input className="form-input" value={form.genericName || form.generic_name} onChange={e => setForm(f => ({ ...f, genericName: e.target.value, generic_name: e.target.value }))} placeholder="e.g. Paracetamol" />
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Micro Labs" />
            </div>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input className="form-input" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="e.g. Abbott" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of the medicine details…" />
          </div>

          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 10 }}>Pricing & Discount</h3>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">MRP (₹) *</label>
              <input className="form-input" type="number" value={form.mrp} onChange={e => handlePriceChange('mrp', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹) *</label>
              <input className="form-input" type="number" value={form.price} onChange={e => handlePriceChange('price', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Discount (% Auto Calculated)</label>
              <input className="form-input" type="number" value={form.discount} disabled style={{ opacity: 0.6, background: 'rgba(0,0,0,0.1)' }} />
            </div>
          </div>

          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 10 }}>Inventory & Stock</h3>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Stock Quantity *</label>
              <input className="form-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">SKU (Auto generates if blank)</label>
              <input className="form-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. CRC-500" />
            </div>
            <div className="form-group">
              <label className="form-label">Batch Number</label>
              <input className="form-input" value={form.batchNo || form.batch_no} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value, batch_no: e.target.value }))} placeholder="e.g. B-GEN999" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={form.expiryDate || form.expiry_date} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value, expiry_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Level</label>
              <input className="form-input" type="number" value={form.reorderLevel || form.reorder_level} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value, reorder_level: e.target.value }))} placeholder="10" />
            </div>
          </div>

          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 10 }}>Product Image</h3>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <div 
              style={{ 
                border: '2px dashed var(--border, #334155)', 
                borderRadius: '8px', 
                padding: '20px', 
                textAlign: 'center', 
                background: 'rgba(255, 255, 255, 0.01)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--cyan)'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border)';
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  await uploadImage(compressed);
                }
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                {form.image_url || form.image ? (
                  <div style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'white' }}>
                    <img src={form.image_url || form.image} alt="Product Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, image_url: '', image: '' }))} 
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ width: 90, height: 90, borderRadius: 8, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 11 }}>
                    No Image
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProductImageUpload} 
                    disabled={uploading} 
                    style={{ display: 'none' }}
                    id="product-image-file"
                  />
                  <label 
                    htmlFor="product-image-file" 
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {uploading ? <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Drag & Drop or click to upload. Large images are compressed automatically.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
            <label className="form-toggle" onClick={() => setForm(f => ({ ...f, prescriptionRequired: !f.prescriptionRequired }))}>
              <div className={`toggle-switch${form.prescriptionRequired ? ' on' : ''}`}><div className="toggle-knob" /></div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Prescription Required</span>
            </label>
            <label className="form-toggle" onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}>
              <div className={`toggle-switch${form.featured ? ' on' : ''}`}><div className="toggle-knob" /></div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Featured Product</span>
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {modal === 'add' ? '+ Add Product' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Product Management</h1>
          <p>{products.length} products · {products.filter(p => p.stock === 0).length} out of stock · {products.filter(p => p.stock > 0 && p.stock <= (p.reorderLevel || 10)).length} low stock</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}><Upload size={14} /> Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input placeholder="Search by name, brand, generic, SKU…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
          <option value="All">All Stock</option>
          <option value="In">In Stock</option>
          <option value="Low">Low Stock</option>
          <option value="Out">Out of Stock</option>
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} results</span>
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {paged.map(p => (
          <div key={p.id} className="product-card">
            <div className="product-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', height: 120, background: 'rgba(255,255,255,0.02)' }}>
              {p.image_url || p.image ? (
                <img src={p.image_url || p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                '💊'
              )}
              <div className="product-img-badges">
                {p.prescriptionRequired && <span className="badge badge-rx">Rx</span>}
                {p.featured && <span className="badge badge-featured">⭐</span>}
                <span className={`badge ${stockBadge(p.stock, p.reorderLevel)}`}>{stockLabel(p.stock, p.reorderLevel)}</span>
              </div>
            </div>
            <div className="product-card-body">
              <div className="product-card-name truncate" title={p.name}>{p.name}</div>
              <div className="product-card-brand">{p.brand} · {p.category}</div>
              <div className="product-card-price" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {p.mrp > p.price && p.mrp > 0 && (
                    <span className="product-mrp" style={{ textDecoration: 'line-through', fontSize: '11px', opacity: 0.7 }}>
                      ₹{p.mrp}
                    </span>
                  )}
                  {p.discount > 0 && (
                    <span 
                      className="product-discount"
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '1px 5px',
                        borderRadius: '12px',
                        fontSize: '9px',
                        fontWeight: '700',
                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.35)',
                        display: 'inline-block'
                      }}
                    >
                      {p.discount}% OFF
                    </span>
                  )}
                </div>
                <span className="product-price" style={{ fontSize: '15px', fontWeight: '800' }}>₹{p.price}</span>
              </div>
              <div className="product-stock" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: <strong>{p.stock}</strong> units · SKU: {p.sku || 'N/A'}</div>
              <div className="product-card-actions">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); openEdit(p); }} title="Edit"><Edit2 size={14} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); duplicate(p); }} title="Duplicate"><Copy size={14} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); openDelete(p); }} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
        </div>
      )}

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && <ProductModal />}
      {modal === 'delete' && (
        <div className="modal-overlay" onClick={closeModal} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Delete Product</h2><p>This action cannot be undone.</p></div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', borderRadius: 8, padding: 14 }}>
                <AlertTriangle size={20} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Delete "{selected?.name}"?</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>This will permanently remove the product and its inventory record.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <div className="modal-overlay" onClick={() => { console.log("Closing Bulk Upload modal"); setBulkModalOpen(false); }} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <h2>Bulk Product Upload</h2>
                <p>Import products list via CSV or Excel (.xlsx) templates.</p>
              </div>
              <button className="modal-close" onClick={() => setBulkModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)', borderRadius: 8, padding: '12px 16px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Get the standard CSV template with required structure:</span>
                <button className="btn btn-secondary btn-sm" onClick={downloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Download size={12} /> Download Sample Template
                </button>
              </div>

              <div 
                style={{ 
                  border: '2px dashed var(--border, #334155)', 
                  borderRadius: '8px', 
                  padding: '24px 16px', 
                  textAlign: 'center', 
                  background: 'rgba(255, 255, 255, 0.01)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--cyan)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border)';
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    await handleBulkFileChange({ target: { files: [file] } });
                  }
                }}
              >
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  onChange={handleBulkFileChange}
                  style={{ display: 'none' }}
                  id="bulk-upload-file-input"
                />
                <label htmlFor="bulk-upload-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Upload size={32} style={{ color: 'var(--cyan)', opacity: 0.8 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Choose File or Drag & Drop</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supports Excel (.xlsx, .xls) and CSV files</span>
                </label>
              </div>

              {/* Parsing Results */}
              {(importData.valid.length > 0 || importData.invalid.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#10b981', display: 'block' }}>{importData.valid.length}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ready to Import</span>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', display: 'block' }}>{importData.invalid.length}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Skipped / Errors</span>
                    </div>
                  </div>

                  {importData.invalid.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.08)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Validation Errors Summary</span>
                        <button className="btn btn-secondary btn-sm" onClick={downloadFailedRows} style={{ padding: '2px 8px', fontSize: 10 }}>
                          📥 Download Failed Rows
                        </button>
                      </div>
                      <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {importData.invalid.map((inv, idx) => (
                          <div key={idx} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Row {inv.rowNumber}: <b>{inv.item.name || 'Unknown Name'}</b></span>
                            <span style={{ color: '#f87171' }}>{inv.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={executeBulkImport}
                disabled={importData.valid.length === 0 || isImporting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isImporting ? <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {isImporting ? 'Importing...' : `🚀 Import ${importData.valid.length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Products;
