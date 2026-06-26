import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Save, Store, Clock, Share2, Palette } from 'lucide-react';

const SETTINGS_TABS = [
  { key: 'store', label: 'Store Info', icon: '🏪' },
  { key: 'business', label: 'Business', icon: '⏰' },
  { key: 'social', label: 'Social Media', icon: '🌐' },
  { key: 'branding', label: 'Branding', icon: '🎨' },
];

const Settings = () => {
  const { settings, updateSettings } = useAdmin();
  const [tab, setTab] = useState('store');
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (label, key, type = 'text', hint = '') => (
    <div key={key} className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} />
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Store Settings</h1>
          <p>Manage your store configuration and preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Settings Nav */}
        <div className="settings-nav">
          {SETTINGS_TABS.map(t => (
            <div key={t.key} className={`settings-nav-item${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <span style={{ fontSize: 18 }}>{t.icon}</span> {t.label}
            </div>
          ))}
        </div>

        {/* Settings Panel */}
        <div className="settings-panel">
          {tab === 'store' && (
            <>
              <h2>Store Information</h2>
              <p>Basic details about your pharmacy that appear on the website and invoices.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {field('Store Name', 'storeName')}
                {field('Address', 'address')}
                <div className="form-row form-row-2">
                  {field('Phone Number', 'phone', 'tel')}
                  {field('WhatsApp Number', 'whatsapp', 'tel')}
                </div>
                {field('Email Address', 'email', 'email')}
              </div>
            </>
          )}

          {tab === 'business' && (
            <>
              <h2>Business Settings</h2>
              <p>Configure store timings, pickup availability and order policies.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Weekday Hours (Mon–Sat)</p>
                  <div className="form-row form-row-2">
                    {field('Opening Time', 'openTime', 'time')}
                    {field('Closing Time', 'closeTime', 'time')}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Sunday Hours</p>
                  <div className="form-row form-row-2">
                    {field('Opening Time', 'sundayOpen', 'time')}
                    {field('Closing Time', 'sundayClose', 'time')}
                  </div>
                </div>
                <div className="divider" />
                {field('Minimum Order Value (₹)', 'minOrderValue', 'number', 'Orders below this value will not be accepted')}
              </div>
            </>
          )}

          {tab === 'social' && (
            <>
              <h2>Social Media Links</h2>
              <p>Add your social media profiles to display on the website footer.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: '📘 Facebook URL', key: 'facebook' },
                  { label: '📸 Instagram URL', key: 'instagram' },
                  { label: '🐦 Twitter / X URL', key: 'twitter' },
                  { label: '▶️ YouTube URL', key: 'youtube' },
                ].map(({ label, key }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="url" value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder="https://…" />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'branding' && (
            <>
              <h2>Branding & Theme</h2>
              <p>Upload your logo, favicon, and customize the store's visual identity.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="form-label">Store Logo</label>
                  <div style={{ marginTop: 8, border: '2px dashed var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => alert('Logo upload: Connect to Firebase/Supabase storage for file uploads')}>
                    <div style={{ fontSize: 48 }}>🏪</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Click to upload logo</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, SVG — max 2MB</p>
                  </div>
                </div>
                <div>
                  <label className="form-label">Favicon</label>
                  <div style={{ marginTop: 8, border: '2px dashed var(--border)', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => alert('Favicon upload: Connect to storage backend')}>
                    <div style={{ fontSize: 32 }}>💊</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>ICO, PNG — 32×32px</p>
                  </div>
                </div>
                <div>
                  <label className="form-label">Theme Color</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {['#06b6d4', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'].map(color => (
                      <div key={color} style={{ width: 36, height: 36, borderRadius: '50%', background: color, cursor: 'pointer', border: form.themeColor === color ? '3px solid white' : '3px solid transparent', boxShadow: form.themeColor === color ? `0 0 0 2px ${color}` : 'none' }}
                        onClick={() => set('themeColor', color)} />
                    ))}
                  </div>
                  <span className="form-hint" style={{ marginTop: 8, display: 'block' }}>Selected theme color will be applied to the admin panel accent.</span>
                </div>
              </div>
            </>
          )}

          <div className="settings-save-bar">
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--green)', marginRight: 'auto', fontWeight: 600 }}>
                ✅ Settings saved successfully!
              </span>
            )}
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
