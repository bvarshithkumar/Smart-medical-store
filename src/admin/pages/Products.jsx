import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Plus, Search, Edit2, Trash2, Copy, X, AlertTriangle, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonGrid, ErrorState } from '../../components/LoadingStates';

const EMPTY_PRODUCT = {
  name: '', category: 'Fever & Pain', brand: '', description: '',
  price: '', mrp: '', discount: '', stock: '',
  prescriptionRequired: false, featured: false, sku: '',
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
  const PER_PAGE = 12;

  if (dataLoading) {
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

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchStock = stockFilter === 'All'
      ? true : stockFilter === 'Low' ? (p.stock > 0 && p.stock <= 10)
        : stockFilter === 'Out' ? p.stock === 0 : p.stock > 10;
    return matchSearch && matchCat && matchStock;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd = () => { setForm(EMPTY_PRODUCT); setModal('add'); };
  const openEdit = (p) => { setForm({ ...p }); setSelected(p); setModal('edit'); };
  const openDelete = (p) => { setSelected(p); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    const data = { ...form, price: +form.price, mrp: +form.mrp, discount: +form.discount, stock: +form.stock };
    if (modal === 'add') addProduct(data);
    else if (modal === 'edit' && selected) updateProduct(selected.id, data);
    closeModal();
  };

  const handleDelete = () => {
    if (selected) deleteProduct(selected.id);
    closeModal();
  };

  const duplicate = (p) => {
    addProduct({ ...p, name: `${p.name} (Copy)`, id: undefined });
  };

  const stockBadge = (s) => s === 0 ? 'badge-out-stock' : s <= 10 ? 'badge-low-stock' : 'badge-in-stock';
  const stockLabel = (s) => s === 0 ? 'Out of Stock' : s <= 10 ? 'Low Stock' : 'In Stock';

  const ProductModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{modal === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
            <p>Fill in the product details below</p>
          </div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>
        <div className="modal-body" style={{ gap: 16 }}>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Crocin" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="form-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. CRC-500" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of the medicine…" />
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Selling Price (₹) *</label>
              <input className="form-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">MRP (₹)</label>
              <input className="form-input" type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Discount (%)</label>
              <input className="form-input" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Stock Quantity</label>
            <input className="form-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Product Image</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
              {form.image_url || form.image ? (
                <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={form.image_url || form.image} alt="Product Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button 
                    type="button" 
                    onClick={() => setForm(prev => ({ ...prev, image_url: '', image: '' }))} 
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 11 }}>
                  No Image
                </div>
              )}
              <div style={{ flex: 1 }}>
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
                  Supported formats: PNG, JPG, WEBP, SVG (max 10MB)
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
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
          <p>{products.length} products · {products.filter(p => p.stock === 0).length} out of stock · {products.filter(p => p.stock > 0 && p.stock <= 10).length} low stock</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => alert('CSV upload: Connect to backend for file processing')}><Upload size={14} /> Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input placeholder="Search by name, brand, SKU…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
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
                <span className={`badge ${stockBadge(p.stock)}`}>{stockLabel(p.stock)}</span>
              </div>
            </div>
            <div className="product-card-body">
              <div className="product-card-name truncate">{p.name}</div>
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
              <div className="product-stock">Stock: <strong>{p.stock}</strong> units · SKU: {p.sku}</div>
              <div className="product-card-actions">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={14} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => duplicate(p)} title="Duplicate"><Copy size={14} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openDelete(p)} title="Delete" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Delete Product</h2><p>This action cannot be undone.</p></div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: 14 }}>
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
    </AdminLayout>
  );
};

export default Products;
