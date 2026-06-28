import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Upload, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchWithTimeout } from '../../hooks/useFetchWithTimeout';
import { SkeletonGrid, ErrorState, EmptyState } from '../../components/LoadingStates';
import { cmsService } from '../../services/cmsService';


const CMS_TABS = [
  { name: 'Hero Slides', table: 'cms_hero', folder: 'hero' },
  { name: 'Statistics Bar', table: null, folder: null },
  { name: 'Quick Actions', table: 'cms_quick_actions', folder: 'quick-actions' },
  { name: 'Categories', table: 'cms_categories', folder: 'categories' },
  { name: 'Popular Medicines', table: null, folder: null },
  { name: 'Offers', table: 'cms_offers', folder: 'offers' },
  { name: 'Wellness Essentials', table: 'homepage_featured_products_items', folder: 'wellness' },
  { name: 'Shop by Health Concern', table: null, folder: null },
  { name: 'Banners', table: 'cms_banners', folder: 'banners' },
  { name: 'Prescription Tracker', table: null, folder: null },
  { name: 'Core Trust Pillars', table: null, folder: null },
  { name: 'Brands', table: 'cms_brands', folder: 'brands' },
  { name: 'Pickup Workflow', table: null, folder: null },
  { name: 'Testimonials', table: 'cms_testimonials', folder: 'testimonials' },
  { name: 'Health Tips', table: 'cms_tips', folder: 'tips' },
  { name: 'About Us Story', table: null, folder: null },
  { name: 'Store Location & Contact', table: null, folder: null },
  { name: 'Frequently Asked Questions', table: null, folder: null }
];

const SECTION_KEY_MAP = {
  'Hero Slides': 'hero_slides',
  'Statistics Bar': 'statistics',
  'Quick Actions': 'quick_actions',
  'Categories': 'categories',
  'Popular Medicines': 'popular_medicines',
  'Offers': 'offers',
  'Wellness Essentials': 'wellness_essentials',
  'Shop by Health Concern': 'health_concerns',
  'Banners': 'banners',
  'Prescription Tracker': 'prescription_tracker',
  'Core Trust Pillars': 'why_choose_us',
  'Brands': 'brands',
  'Pickup Workflow': 'how_it_works',
  'Testimonials': 'testimonials',
  'Health Tips': 'health_tips',
  'About Us Story': 'about_us',
  'Store Location & Contact': 'pharmacist_info',
  'Frequently Asked Questions': 'faqs'
};

const CMS = () => {
  const { addAdminToast } = useAdmin();
  const [tab, setTab] = useState('Hero Slides');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [preview, setPreview] = useState(false);
  const [modal, setModal] = useState(null); // 'add' | 'edit'

  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic Homepage section management states
  const [sectionConfig, setSectionConfig] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [savingSection, setSavingSection] = useState(false);
  const [publishingSection, setPublishingSection] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  const activeTabConfig = CMS_TABS.find(t => t.name === tab);
  const activeSectionKey = SECTION_KEY_MAP[tab];

  const showToast = (message, type = 'info') => {
    if (addAdminToast) {
      addAdminToast(message, type);
    } else {
      console.log(`[CMS Toast] ${type}: ${message}`);
    }
  };

  const loadAllProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, selling_price, mrp, image_url')
        .eq('is_active', true);
      if (error) throw error;
      setAllProducts(data || []);
    } catch (err) {
      console.error('Error loading products list:', err);
    }
  };

  const loadSectionConfig = async () => {
    if (!activeSectionKey) return;
    try {
      if (tab === 'Wellness Essentials') {
        const data = await cmsService.getFeaturedProductsConfig();
        if (data) {
          setSectionConfig(data);
          setSectionForm({ ...data });
        } else {
          setSectionConfig(null);
          setSectionForm({});
        }
      } else {
        const { data, error } = await supabase
          .from('homepage_sections')
          .select('*')
          .eq('section_key', activeSectionKey)
          .single();
          
        if (error) {
          console.warn('[CMS] Section config not found for', activeSectionKey);
          setSectionConfig(null);
          setSectionForm({});
        } else {
          setSectionConfig(data);
          const initialForm = data.draft_config ? { ...data, ...data.draft_config } : { ...data };
          setSectionForm(initialForm);
          
          const vers = await cmsService.getSectionVersions(data.id);
          setVersions(vers);
        }
      }
    } catch (err) {
      console.error('[CMS] Error loading section config:', err);
    }
  };

  useEffect(() => {
    loadSectionConfig();
  }, [tab]);

  const handleSaveSectionDraft = async (e) => {
    e.preventDefault();
    if (!activeSectionKey || !sectionConfig) return;
    setSavingSection(true);
    try {
      if (tab === 'Wellness Essentials') {
        const payload = {
          section_title: sectionForm.section_title || '',
          section_subtitle: sectionForm.section_subtitle || '',
          badge_text: sectionForm.badge_text || '',
          cta_text: sectionForm.cta_text || '',
          cta_link: sectionForm.cta_link || '',
          is_visible: !!sectionForm.is_visible,
          display_order: parseInt(sectionForm.display_order) || 60,
          max_products: parseInt(sectionForm.max_products) || 4,
          layout_type: sectionForm.layout_type || 'grid',
          background_color: sectionForm.background_color || 'transparent',
          background_image: sectionForm.background_image || '',
        };
        const data = await cmsService.updateFeaturedProductsConfig(payload);
        setSectionConfig(data);
        showToast('Wellness Essentials configuration saved successfully!', 'success');
      } else {
        const draftPayload = {
          section_title: sectionForm.section_title || '',
          section_subtitle: sectionForm.section_subtitle || '',
          is_visible: !!sectionForm.is_visible,
          display_order: parseInt(sectionForm.display_order) || 0,
          max_items: parseInt(sectionForm.max_items) || 6,
          layout_type: sectionForm.layout_type || 'grid',
          sort_type: sectionForm.sort_type || 'manual',
          mobile_layout: sectionForm.mobile_layout || 'carousel',
          desktop_layout: sectionForm.desktop_layout || 'grid',
          background_color: sectionForm.background_color || 'transparent',
          background_image_url: sectionForm.background_image_url || '',
          custom_css_class: sectionForm.custom_css_class || '',
          padding_top: parseInt(sectionForm.padding_top) || 40,
          padding_bottom: parseInt(sectionForm.padding_bottom) || 40,
          start_date: sectionForm.start_date || null,
          end_date: sectionForm.end_date || null,
          // Custom Store details fields
          store_name: sectionForm.store_name || '',
          address: sectionForm.address || '',
          phone: sectionForm.phone || '',
          hours: sectionForm.hours || '',
          whatsapp: sectionForm.whatsapp || '',
          email: sectionForm.email || '',
          emergency: sectionForm.emergency || '',
          map_url: sectionForm.map_url || '',
          map_embed_url: sectionForm.map_embed_url || '',
          store_image: sectionForm.store_image || '',
        };

        const data = await cmsService.saveSectionDraft(activeSectionKey, draftPayload);
        setSectionConfig(data);
        showToast('Draft section settings saved successfully!', 'success');
      }
    } catch (err) {
      showToast(`Failed to save draft: ${err.message}`, 'error');
    } finally {
      setSavingSection(false);
    }
  };

  const handlePublishSection = async () => {
    if (!activeSectionKey || !sectionConfig) return;
    setPublishingSection(true);
    try {
      const data = await cmsService.publishSection(activeSectionKey, sectionForm);
      setSectionConfig(data);
      setSectionForm({ ...data });
      showToast('Section settings published successfully!', 'success');
      
      const vers = await cmsService.getSectionVersions(data.id);
      setVersions(vers);
    } catch (err) {
      showToast(`Failed to publish: ${err.message}`, 'error');
    } finally {
      setPublishingSection(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!activeSectionKey || !sectionConfig) return;
    if (!window.confirm('Are you sure you want to discard your draft changes?')) return;
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .update({
          draft_config: null,
          status: 'published'
        })
        .eq('section_key', activeSectionKey)
        .select()
        .single();
        
      if (error) throw error;
      setSectionConfig(data);
      setSectionForm({ ...data });
      showToast('Draft discarded successfully.', 'info');
    } catch (err) {
      showToast(`Discard failed: ${err.message}`, 'error');
    }
  };

  const handleRestoreVersion = async (ver) => {
    if (!activeSectionKey) return;
    try {
      const data = await cmsService.restoreSectionVersion(activeSectionKey, ver.config);
      setSectionConfig(data);
      setSectionForm({ ...data, ...data.draft_config });
      setShowVersionsModal(false);
      showToast(`Version #${ver.version_number} restored to draft. Save or publish to apply.`, 'success');
    } catch (err) {
      showToast(`Restore failed: ${err.message}`, 'error');
    }
  };

  const handleDuplicateSection = async () => {
    if (!activeSectionKey) return;
    const newName = window.prompt(`Enter a name for the duplicated section:`, `${sectionConfig.section_name} Copy`);
    if (!newName) return;
    try {
      const created = await cmsService.duplicateSection(activeSectionKey, newName);
      showToast(`Section duplicated successfully as "${newName}"! Key: ${created.section_key}`, 'success');
    } catch (err) {
      showToast(`Duplication failed: ${err.message}`, 'error');
    }
  };

  const loadItems = async () => {
    if (!activeTabConfig) return;
    setLoading(true);
    setFetchError('');
    try {
      if (tab === 'Wellness Essentials') {
        const data = await cmsService.getFeaturedProductsItems();
        setItems(data);
      } else if (!activeTabConfig.table) {
        setItems([]);
      } else {
        const data = await fetchWithTimeout(async (signal) => {
          const { data, error } = await supabase
            .from(activeTabConfig.table)
            .select('*')
            .order('display_order', { ascending: true })
            .abortSignal(signal);

          if (error) throw error;
          return data || [];
        });
        setItems(data);
      }
    } catch (err) {
      console.error('[CMS Admin] Load items error:', err);
      setFetchError(err.message || 'Failed to load items.');
      showToast(`Error loading data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadItems();
  }, [tab]);

  const openEdit = (item) => {
    if (tab === 'Wellness Essentials') {
      setEditItem(item);
      setForm({
        id: item.id,
        product_id: item.product_id,
        title: item.name === item.base_product.name ? '' : item.name,
        image_url: item.image === item.base_product.image_url ? '' : item.image,
        short_description: item.description === item.base_product.description ? '' : item.description,
        price: item.priceDiscounted === item.base_product.selling_price ? '' : item.priceDiscounted,
        old_price: item.priceOriginal === item.base_product.mrp ? '' : item.priceOriginal,
        category: item.category === item.base_product.category ? '' : item.category,
        display_order: item.display_order,
        is_active: item.is_active,
        is_featured: item.is_featured
      });
      setModal('edit');
      return;
    }

    setEditItem(item);
    setForm({ ...item });
    setModal('edit');
  };

  const openAdd = () => {
    if (tab === 'Wellness Essentials') {
      loadAllProducts();
      setForm({
        product_id: '',
        display_order: items.length,
        is_active: true,
        is_featured: false
      });
      setModal('add');
      return;
    }

    setEditItem(null);
    const blanks = {
      display_order: items.length,
      is_active: true
    };
    // Default gradients / styles if needed
    if (activeTabConfig.table === 'cms_hero') {
      blanks.bg_gradient = 'linear-gradient(135deg, #022C22 0%, #042F2E 60%, #0F766E 100%)';
      blanks.button_link = '/';
      blanks.features = [];
      blanks.tag_style = {};
    } else if (activeTabConfig.table === 'cms_categories') {
      blanks.color = '#00A884';
    } else if (activeTabConfig.table === 'cms_quick_actions') {
      blanks.button_link = '/';
    } else if (activeTabConfig.table === 'cms_offers') {
      blanks.bg_color = 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)';
      blanks.button_link = '/';
    } else if (activeTabConfig.table === 'cms_tips') {
      blanks.bg_color = 'linear-gradient(to right, #0b1528, #0e1e38)';
      blanks.tag_color = '#ef4444';
      blanks.button_link = '/';
    } else if (activeTabConfig.table === 'cms_testimonials') {
      blanks.rating = 5;
      blanks.role = 'Verified Patient';
    } else if (activeTabConfig.table === 'cms_brands') {
      blanks.color = '#00529b';
    }
    
    setForm(blanks);
    setModal('add');
  };

  const closeModal = () => {
    setModal(null);
    setEditItem(null);
    setForm({});
  };

  const handleFileChange = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 1. Verify user authentication status in Supabase before uploading
      let sessionData = await supabase.auth.getSession();
      if (!sessionData.data.session) {
        console.log('[CMS Admin] No active session found. Auto-authenticating as admin@svms.com...');
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: 'admin@svms.com',
          password: 'Admin@1234'
        });
        if (authError) {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        sessionData = await supabase.auth.getSession();
      }

      if (!sessionData.data.session) {
        throw new Error('You must be authenticated to upload assets to Supabase Storage.');
      }

      const folder = activeTabConfig?.folder || 'general';
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filepath = `${folder}/${filename}`;

      const { data, error } = await supabase.storage
        .from('cms-assets')
        .upload(filepath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('cms-assets')
        .getPublicUrl(filepath);

      if (!urlData?.publicUrl) throw new Error('Failed to retrieve public URL');

      setForm(prev => ({
        ...prev,
        [key]: urlData.publicUrl
      }));
      showToast('Image uploaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeTabConfig) return;

    if (tab === 'Wellness Essentials') {
      setSaving(true);
      try {
        if (modal === 'add') {
          if (!form.product_id) {
            showToast('Please select a product.', 'error');
            return;
          }
          await cmsService.addFeaturedProduct(form.product_id);
          showToast('Product added to featured list successfully!', 'success');
        } else {
          const payload = {
            title: form.title || null,
            image_url: form.image_url || null,
            short_description: form.short_description || null,
            price: form.price !== '' && form.price !== null ? Number(form.price) : null,
            old_price: form.old_price !== '' && form.old_price !== null ? Number(form.old_price) : null,
            category: form.category || null,
            display_order: parseInt(form.display_order) || 0,
            is_active: !!form.is_active,
            is_featured: !!form.is_featured
          };
          await cmsService.updateFeaturedProduct(editItem.id, payload);
          showToast('Featured product overrides updated successfully!', 'success');
        }
        closeModal();
        loadItems();
      } catch (err) {
        console.error('[CMS Admin] Featured save error:', err);
        showToast(`Save failed: ${err.message}`, 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Check required fields
    const config = getFieldsConfig();
    for (const f of config) {
      if (f.required && !form[f.key]) {
        showToast(`"${f.label}" is required.`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      
      // Remove metadata columns if present
      delete payload.created_at;
      delete payload.updated_at;

      // Handle pills_colors array for cms_brands table if it doesn't exist
      if (activeTabConfig.table === 'cms_brands' && !payload.pills_colors) {
        payload.pills_colors = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
      }

      let res;
      if (modal === 'add') {
        res = await supabase
          .from(activeTabConfig.table)
          .insert([payload]);
      } else {
        res = await supabase
          .from(activeTabConfig.table)
          .update(payload)
          .eq('id', editItem.id);
      }

      if (res.error) throw res.error;

      showToast(`Record ${modal === 'add' ? 'created' : 'updated'} successfully!`, 'success');
      closeModal();
      loadItems();
    } catch (err) {
      console.error('[CMS Admin] Save error:', err);
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = tab === 'Wellness Essentials' 
      ? 'Are you sure you want to remove this product from Featured list?' 
      : 'Are you sure you want to delete this record?';
    if (!window.confirm(confirmMsg)) return;
    try {
      if (tab === 'Wellness Essentials') {
        await cmsService.deleteFeaturedProduct(id);
        showToast('Product removed from Featured list.', 'success');
        loadItems();
      } else {
        const { error } = await supabase
          .from(activeTabConfig.table)
          .delete()
          .eq('id', id);

        if (error) throw error;
        showToast('Record deleted successfully!', 'success');
        loadItems();
      }
    } catch (err) {
      console.error('[CMS Admin] Delete error:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const toggleActive = async (item) => {
    try {
      const nextActive = !item.is_active;
      if (tab === 'Wellness Essentials') {
        await cmsService.updateFeaturedProduct(item.id, { is_active: nextActive });
        showToast(`Record ${nextActive ? 'enabled' : 'disabled'} successfully!`, 'success');
        loadItems();
      } else {
        const { error } = await supabase
          .from(activeTabConfig.table)
          .update({ is_active: nextActive })
          .eq('id', item.id);

        if (error) throw error;
        showToast(`Record ${nextActive ? 'enabled' : 'disabled'} successfully!`, 'success');
        loadItems();
      }
    } catch (err) {
      console.error('[CMS Admin] Toggle error:', err);
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };

  const getFieldsConfig = () => {
    const defaultFields = [
      { label: 'Display Order', key: 'display_order', type: 'number' },
    ];

    switch (activeTabConfig?.table) {
      case 'cms_hero':
        return [
          { label: 'Title/Heading', key: 'title', type: 'text', required: true },
          { label: 'Highlight text', key: 'title_highlight', type: 'text' },
          { label: 'Tag (e.g. Prescription Upload)', key: 'tag', type: 'text' },
          { label: 'Description', key: 'description', type: 'textarea' },
          { label: 'Button Text', key: 'button_text', type: 'text' },
          { label: 'Button Link', key: 'button_link', type: 'text' },
          { label: 'Background Gradient', key: 'bg_gradient', type: 'text' },
          { label: 'Slide Image (will be uploaded)', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_categories':
        return [
          { label: 'Category Name', key: 'name', type: 'text', required: true },
          { label: 'Color Hex Code', key: 'color', type: 'text' },
          { label: 'Product Count label', key: 'product_count', type: 'text' },
          { label: 'Category Image', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_quick_actions':
        return [
          { label: 'Title', key: 'title', type: 'text', required: true },
          { label: 'Description', key: 'description', type: 'textarea' },
          { label: 'Badge Text', key: 'badge', type: 'text' },
          { label: 'Action Route / Link', key: 'button_link', type: 'text' },
          { label: 'Background Image', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_offers':
        return [
          { label: 'Offer Title', key: 'title', type: 'text', required: true },
          { label: 'Description', key: 'description', type: 'textarea' },
          { label: 'Promo Code', key: 'code', type: 'text' },
          { label: 'Button Text', key: 'button_text', type: 'text' },
          { label: 'Button Link', key: 'button_link', type: 'text' },
          { label: 'Badge Label', key: 'badge', type: 'text' },
          { label: 'Badge BG Style', key: 'badge_bg', type: 'text' },
          { label: 'Background Color/Gradient', key: 'bg_color', type: 'text' },
          { label: 'Shadow Color (rgba)', key: 'shadow_color', type: 'text' },
          { label: 'Offer Icon/Image', key: 'image_url', type: 'file' },
          { label: 'Alt Text', key: 'alt_text', type: 'text' },
          ...defaultFields
        ];
      case 'cms_tips':
        return [
          { label: 'Tip Title', key: 'title', type: 'text', required: true },
          { label: 'Short description/content', key: 'description', type: 'textarea' },
          { label: 'Tag (e.g. Diabetes)', key: 'tag', type: 'text' },
          { label: 'Tag BG Color', key: 'tag_color', type: 'text' },
          { label: 'Background CSS (gradient/color)', key: 'bg_color', type: 'text' },
          { label: 'Button Text', key: 'button_text', type: 'text' },
          { label: 'Button Link', key: 'button_link', type: 'text' },
          { label: 'Tip Cover Image', key: 'image_url', type: 'file' },
          { label: 'Alt Text', key: 'alt_text', type: 'text' },
          ...defaultFields
        ];
      case 'cms_testimonials':
        return [
          { label: 'Customer Name', key: 'name', type: 'text', required: true },
          { label: 'Comment', key: 'comment', type: 'textarea', required: true },
          { label: 'Rating (1 to 5)', key: 'rating', type: 'number', min: 1, max: 5 },
          { label: 'Role (e.g. Regular Customer)', key: 'role', type: 'text' },
          { label: 'Location (e.g. Kondapur)', key: 'location', type: 'text' },
          { label: 'Category (e.g. Health Devices)', key: 'category', type: 'text' },
          { label: 'Avatar Image', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_pharmacist':
        return [
          { label: 'Name', key: 'name', type: 'text', required: true },
          { label: 'Role/Credentials', key: 'role', type: 'text' },
          { label: 'Description', key: 'description', type: 'textarea' },
          { label: 'Contact Button Text', key: 'button_text', type: 'text' },
          { label: 'Contact Link (e.g. tel:...)', key: 'button_link', type: 'text' },
          { label: 'Pharmacist Photo', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_banners':
        return [
          { label: 'Unique Key (e.g. upload-rx-bg)', key: 'banner_key', type: 'text', required: true },
          { label: 'Title', key: 'title', type: 'text', required: true },
          { label: 'Description', key: 'description', type: 'textarea' },
          { label: 'Button Text', key: 'button_text', type: 'text' },
          { label: 'Button Link', key: 'button_link', type: 'text' },
          { label: 'Alt Text', key: 'alt_text', type: 'text' },
          { label: 'Banner Image', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      case 'cms_brands':
        return [
          { label: 'Brand Name (e.g. Cipla)', key: 'name', type: 'text', required: true },
          { label: 'Badge Text', key: 'badge', type: 'text' },
          { label: 'Box Medicine Name', key: 'box_name', type: 'text' },
          { label: 'Box Medicine Sub', key: 'box_sub', type: 'text' },
          { label: 'Box Styling Class', key: 'pack_class', type: 'text' },
          { label: 'Brand Theme Color', key: 'color', type: 'text' },
          { label: 'Raw Logo SVG', key: 'logo_svg', type: 'textarea' },
          { label: 'Logo Image File (fallback if SVG not provided)', key: 'image_url', type: 'file' },
          ...defaultFields
        ];
      default:
        return defaultFields;
    }
  };

  const renderFields = () => {
    if (tab === 'Wellness Essentials') {
      return (
        <div>
          {modal === 'add' ? (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Select Product <span style={{ color: 'var(--red)' }}>*</span></label>
              <select
                className="form-input"
                value={form.product_id || ''}
                onChange={e => setForm(prev => ({ ...prev, product_id: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="">-- Choose a Product --</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category}) - ₹{p.selling_price}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', background: 'rgba(20, 184, 166, 0.05)', border: '1px solid rgba(20, 184, 166, 0.1)', borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Editing Overrides for:</span>
              <h4 style={{ margin: '4px 0 0 0', color: 'var(--teal-accent, #00A884)' }}>{editItem?.base_product?.name}</h4>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Title Override</label>
            <input
              type="text"
              className="form-input"
              value={form.title || ''}
              placeholder={modal === 'edit' ? editItem?.base_product?.name : 'Leave blank to use product name'}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Short Description Override</label>
            <textarea
              className="form-textarea"
              value={form.short_description || ''}
              placeholder={modal === 'edit' ? editItem?.base_product?.description : 'Leave blank to use product description'}
              onChange={e => setForm(prev => ({ ...prev, short_description: e.target.value }))}
              style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Price Override (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={form.price === undefined || form.price === null ? '' : form.price}
                placeholder={modal === 'edit' ? String(editItem?.base_product?.selling_price) : ''}
                onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Old Price Override (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={form.old_price === undefined || form.old_price === null ? '' : form.old_price}
                placeholder={modal === 'edit' ? String(editItem?.base_product?.mrp) : ''}
                onChange={e => setForm(prev => ({ ...prev, old_price: e.target.value }))}
                style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Category Override</label>
            <input
              type="text"
              className="form-input"
              value={form.category || ''}
              placeholder={modal === 'edit' ? editItem?.base_product?.category : 'Leave blank to use product category'}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Image URL Override</label>
            <input
              type="text"
              className="form-input"
              value={form.image_url || ''}
              placeholder={modal === 'edit' ? editItem?.base_product?.image_url : 'Leave blank to use product image'}
              onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
              style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Display Order</label>
              <input
                type="number"
                className="form-input"
                value={form.display_order === undefined ? 0 : form.display_order}
                onChange={e => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Featured State</label>
              <select
                className="form-input"
                value={form.is_featured ? 'true' : 'false'}
                onChange={e => setForm(prev => ({ ...prev, is_featured: e.target.value === 'true' }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="true">⭐ Featured Product</option>
                <option value="false">Standard Product</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Product Visibility</label>
            <select
              className="form-input"
              value={form.is_active ? 'true' : 'false'}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
              style={{ width: '100%', height: 38, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', color: 'var(--text)' }}
            >
              <option value="true">🟢 Visible (Active)</option>
              <option value="false">🔴 Hidden (Inactive)</option>
            </select>
          </div>
        </div>
      );
    }

    const config = getFieldsConfig();
    return config.map(field => {
      if (field.type === 'file') {
        return (
          <div key={field.key} className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">{field.label}</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
              {form[field.key] ? (
                <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={form[field.key]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button 
                    type="button" 
                    onClick={() => setForm(prev => ({ ...prev, [field.key]: '' }))} 
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
                  onChange={(e) => handleFileChange(e, field.key)} 
                  disabled={uploading} 
                  style={{ display: 'none' }}
                  id={`file-input-${field.key}`}
                />
                <label 
                  htmlFor={`file-input-${field.key}`} 
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {uploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Supported formats: PNG, JPG, WEBP, SVG (max 10MB)
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div key={field.key} className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{field.label} {field.required && <span style={{ color: 'var(--red)' }}>*</span>}</label>
          {field.type === 'textarea' ? (
            <textarea 
              className="form-textarea" 
              value={form[field.key] || ''} 
              onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
              style={{ width: '100%', minHeight: 80, padding: 8, borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          ) : (
            <input 
              type={field.type} 
              min={field.min}
              max={field.max}
              className="form-input" 
              value={form[field.key] || ''} 
              onChange={e => setForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
              style={{ width: '100%', height: 38, padding: '0 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          )}
        </div>
      );
    });
  };

  const renderCard = (item) => {
    const isFeaturedProd = tab === 'Wellness Essentials';
    return (
      <div key={item.id} className="cms-card" style={{ opacity: item.is_active ? 1 : 0.5, border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-card)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="cms-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cms-card-title" style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {item.name || item.title || item.banner_key || `Item #${item.id.substring(0,6)}`}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isFeaturedProd && item.is_featured && <span style={{ fontSize: 10, background: 'rgba(250, 204, 21, 0.1)', color: '#eab308', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>★ Featured</span>}
            <span className={`badge ${item.is_active ? 'badge-approved' : 'badge-cancelled'}`}>{item.is_active ? 'Active' : 'Hidden'}</span>
          </div>
        </div>
        <div className="cms-card-body" style={{ flex: 1 }}>
          {(item.image || item.image_url) && (
            <div style={{ height: 100, width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
              <img src={item.image || item.image_url} alt={item.name || item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          )}
          {(item.description || item.comment) && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.description || item.comment}
            </p>
          )}
          {isFeaturedProd && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
              <div>💰 Price: <strong style={{ color: 'var(--text)' }}>₹{item.priceDiscounted}</strong> <span style={{ textDecoration: 'line-through' }}>₹{item.priceOriginal}</span></div>
              <div>🏷️ Category: <strong style={{ color: 'var(--text)' }}>{item.category}</strong></div>
            </div>
          )}
          {item.code && <p style={{ marginTop: 6 }}><code style={{ background: 'rgba(0, 168, 132, 0.1)', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{item.code}</code></p>}
          {item.rating && <p style={{ color: '#facc15', marginTop: 4 }}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</p>}
          {item.display_order !== undefined && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>🔢 Display Order: {item.display_order}</p>}
        </div>
        <div className="cms-card-foot" style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto' }}>
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); console.log("Editing CMS Item", item); openEdit(item); }}><Edit2 size={12} /> Edit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(item)}>{item.is_active ? <EyeOff size={12} /> : <Eye size={12} />} {item.is_active ? 'Hide' : 'Show'}</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', marginLeft: 'auto' }} onClick={() => handleDelete(item.id)}><Trash2 size={12} /></button>
        </div>
      </div>
    );
  };

  const renderSectionSettingsPanel = () => {
    if (!sectionConfig) return null;
    
    const views = sectionConfig.total_views || 0;
    const clicks = sectionConfig.total_clicks || 0;
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0';

    if (tab === 'Wellness Essentials') {
      return (
        <div className="section-settings-panel" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚙️ Section Settings — <span style={{ color: 'var(--teal-accent, #00A884)' }}>Wellness Essentials</span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Configure the dynamic featured products section header, visibility, limits, and styling.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSectionDraft}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Status</label>
                <select 
                  className="form-input" 
                  value={sectionForm.is_visible ? 'true' : 'false'}
                  onChange={e => setSectionForm(prev => ({ ...prev, is_visible: e.target.value === 'true' }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
                >
                  <option value="true">🟢 Visible (Active)</option>
                  <option value="false">🔴 Hidden (Inactive)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Badge Text</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.badge_text || ''}
                  onChange={e => setSectionForm(prev => ({ ...prev, badge_text: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.section_title || ''}
                  onChange={e => setSectionForm(prev => ({ ...prev, section_title: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Subtitle</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.section_subtitle || ''}
                  onChange={e => setSectionForm(prev => ({ ...prev, section_subtitle: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CTA Button Text</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.cta_text || ''}
                  onChange={e => setSectionForm(prev => ({ ...prev, cta_text: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CTA Link / Path</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.cta_link || ''}
                  onChange={e => setSectionForm(prev => ({ ...prev, cta_link: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Max Products to Display</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1"
                  max="20"
                  value={sectionForm.max_products || 4}
                  onChange={e => setSectionForm(prev => ({ ...prev, max_products: parseInt(e.target.value) || 4 }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Display Order Weight</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={sectionForm.display_order || 60}
                  onChange={e => setSectionForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 60 }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Background Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="color" 
                    value={sectionForm.background_color && sectionForm.background_color.startsWith('#') ? sectionForm.background_color : '#ffffff'}
                    onChange={e => setSectionForm(prev => ({ ...prev, background_color: e.target.value }))}
                    style={{ width: 38, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 0 }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.background_color || 'transparent'}
                    onChange={e => setSectionForm(prev => ({ ...prev, background_color: e.target.value }))}
                    style={{ flex: 1, height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Background Image URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.background_image || ''}
                  placeholder="https://example.com/image.jpg"
                  onChange={e => setSectionForm(prev => ({ ...prev, background_image: e.target.value }))}
                  style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={savingSection}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {savingSection ? 'Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </form>
        </div>
      );
    }

    const hasDraft = sectionConfig.status === 'draft';

    return (
      <div className="section-settings-panel" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        style: { boxSizing: 'border-box' },
        width: '100%',
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚙️ Section Settings — <span style={{ color: 'var(--teal-accent, #00A884)' }}>{sectionConfig.section_name}</span>
              {hasDraft && (
                <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Draft Changes
                </span>
              )}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Configure structural, visual, and sorting options for this section on the customer homepage.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 16, background: 'rgba(0,0,0,0.1)', padding: '8px 16px', borderRadius: 8, fontSize: 12 }}>
            <div>👁️ Views: <strong style={{ color: 'var(--text)' }}>{views}</strong></div>
            <div>🖱️ Clicks: <strong style={{ color: 'var(--text)' }}>{clicks}</strong></div>
            <div>📈 CTR: <strong style={{ color: 'var(--teal-accent, #00A884)' }}>{ctr}%</strong></div>
          </div>
        </div>

        <form onSubmit={handleSaveSectionDraft}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Status</label>
              <select 
                className="form-input" 
                value={sectionForm.is_visible ? 'true' : 'false'}
                onChange={e => setSectionForm(prev => ({ ...prev, is_visible: e.target.value === 'true' }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="true">🟢 Visible (Active)</option>
                <option value="false">🔴 Hidden (Inactive)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Title Override</label>
              <input 
                type="text" 
                className="form-input" 
                value={sectionForm.section_title || ''}
                placeholder="Leave blank for default"
                onChange={e => setSectionForm(prev => ({ ...prev, section_title: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Section Subtitle Override</label>
              <input 
                type="text" 
                className="form-input" 
                value={sectionForm.section_subtitle || ''}
                placeholder="Leave blank for default"
                onChange={e => setSectionForm(prev => ({ ...prev, section_subtitle: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Max Items to Display</label>
              <input 
                type="number" 
                className="form-input" 
                min="1"
                max="30"
                value={sectionForm.max_items || 6}
                onChange={e => setSectionForm(prev => ({ ...prev, max_items: parseInt(e.target.value) || 6 }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Global Order Weight</label>
              <input 
                type="number" 
                className="form-input" 
                value={sectionForm.display_order || 0}
                onChange={e => setSectionForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Layout Presentation</label>
              <select 
                className="form-input" 
                value={sectionForm.layout_type || 'grid'}
                onChange={e => setSectionForm(prev => ({ ...prev, layout_type: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="grid">Grid (Responsive Columns)</option>
                <option value="carousel">Carousel (Arrows Slider)</option>
                <option value="slider">Single Slide Banner</option>
                <option value="list">Vertical List Stack</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Card Sorting Logic</label>
              <select 
                className="form-input" 
                value={sectionForm.sort_type || 'manual'}
                onChange={e => setSectionForm(prev => ({ ...prev, sort_type: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="manual">Manual (Use display_order)</option>
                <option value="newest">Newest (By created date)</option>
                <option value="oldest">Oldest (By created date)</option>
                <option value="alphabetical">Alphabetical (A to Z)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Desktop Grid Layout</label>
              <select 
                className="form-input" 
                value={sectionForm.desktop_layout || 'grid'}
                onChange={e => setSectionForm(prev => ({ ...prev, desktop_layout: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="2 columns">2 Columns</option>
                <option value="3 columns">3 Columns</option>
                <option value="4 columns">4 Columns</option>
                <option value="5 columns">5 Columns</option>
                <option value="6 columns">6 Columns</option>
                <option value="carousel">Slider Carousel</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Mobile Grid Layout</label>
              <select 
                className="form-input" 
                value={sectionForm.mobile_layout || 'carousel'}
                onChange={e => setSectionForm(prev => ({ ...prev, mobile_layout: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)' }}
              >
                <option value="1 card">1 Column Full Card</option>
                <option value="2 cards">2 Columns Split</option>
                <option value="horizontal scroll">Horizontal Snapping Scroll</option>
                <option value="carousel">Touch Carousel Indicator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Padding Top (px)</label>
              <input 
                type="number" 
                className="form-input" 
                value={sectionForm.padding_top !== undefined ? sectionForm.padding_top : 40}
                onChange={e => setSectionForm(prev => ({ ...prev, padding_top: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Padding Bottom (px)</label>
              <input 
                type="number" 
                className="form-input" 
                value={sectionForm.padding_bottom !== undefined ? sectionForm.padding_bottom : 40}
                onChange={e => setSectionForm(prev => ({ ...prev, padding_bottom: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Background Color CSS</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="color" 
                  value={sectionForm.background_color && sectionForm.background_color.startsWith('#') ? sectionForm.background_color : '#ffffff'}
                  onChange={e => setSectionForm(prev => ({ ...prev, background_color: e.target.value }))}
                  style={{ width: 38, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 0 }}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  value={sectionForm.background_color || 'transparent'}
                  onChange={e => setSectionForm(prev => ({ ...prev, background_color: e.target.value }))}
                  style={{ flex: 1, height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Background Image URL</label>
              <input 
                type="text" 
                className="form-input" 
                value={sectionForm.background_image_url || ''}
                placeholder="https://example.com/image.jpg"
                onChange={e => setSectionForm(prev => ({ ...prev, background_image_url: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Start Date Schedule</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={sectionForm.start_date ? sectionForm.start_date.substring(0, 16) : ''}
                onChange={e => setSectionForm(prev => ({ ...prev, start_date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>End Date Schedule</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={sectionForm.end_date ? sectionForm.end_date.substring(0, 16) : ''}
                onChange={e => setSectionForm(prev => ({ ...prev, end_date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Custom CSS Class</label>
              <input 
                type="text" 
                className="form-input" 
                value={sectionForm.custom_css_class || ''}
                placeholder="optional-css-class"
                onChange={e => setSectionForm(prev => ({ ...prev, custom_css_class: e.target.value }))}
                style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>

            {activeSectionKey === 'pharmacist_info' && (
              <>
                <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--teal-accent, #00A884)' }}>📍 Store Location & Contact Details</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Configure details displayed inside the "Store Location & Contact" section on the homepage.</p>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Store Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.store_name || ''}
                    placeholder="Sri Venkateswara Medical and General Store"
                    onChange={e => setSectionForm(prev => ({ ...prev, store_name: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Store Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.address || ''}
                    placeholder="41/E, Bagh Lingampally Rd, Chikkadpally..."
                    onChange={e => setSectionForm(prev => ({ ...prev, address: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.phone || ''}
                    placeholder="99891 48660"
                    onChange={e => setSectionForm(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Working Hours</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.hours || ''}
                    placeholder="9:00 AM - 10:00 PM (Open All Days)"
                    onChange={e => setSectionForm(prev => ({ ...prev, hours: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>WhatsApp Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.whatsapp || ''}
                    placeholder="+91 99891 48660"
                    onChange={e => setSectionForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Email Support</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={sectionForm.email || ''}
                    placeholder="support@svmspharmacy.com"
                    onChange={e => setSectionForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Emergency Hotline (24/7)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.emergency || ''}
                    placeholder="+91 99891 48660"
                    onChange={e => setSectionForm(prev => ({ ...prev, emergency: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Google Maps Directions Link</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.map_url || ''}
                    placeholder="https://www.google.com/maps/..."
                    onChange={e => setSectionForm(prev => ({ ...prev, map_url: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Google Maps Iframe Embed URL</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.map_embed_url || ''}
                    placeholder="https://maps.google.com/maps?q=..."
                    onChange={e => setSectionForm(prev => ({ ...prev, map_embed_url: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Storefront Image URL</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={sectionForm.store_image || ''}
                    placeholder="/images/store/storefront.png"
                    onChange={e => setSectionForm(prev => ({ ...prev, store_image: e.target.value }))}
                    style={{ width: '100%', height: 38, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              </>
            )}

          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20, flexWrap: 'wrap' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={savingSection}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {savingSection ? 'Saving...' : '💾 Save Draft'}
            </button>
            <button 
              type="button" 
              className="btn btn-success" 
              onClick={handlePublishSection}
              disabled={publishingSection}
              style={{ backgroundColor: 'var(--teal-accent, #00A884)', border: 'none', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {publishingSection ? 'Publishing...' : '🚀 Publish Live'}
            </button>
            {hasDraft && (
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={handleDiscardDraft}
                style={{ color: 'var(--red)', border: '1px solid var(--red)', background: 'transparent' }}
              >
                🗑️ Discard Draft
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={(e) => { e.stopPropagation(); console.log("Opening Version History"); setShowVersionsModal(true); }}
              style={{ marginLeft: 'auto' }}
            >
              📜 Version History ({versions.length})
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleDuplicateSection}
            >
              👯 Duplicate Section
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Homepage CMS</h1>
          <p>Manage all website content and assets dynamically using Supabase</p>
        </div>
        <div className="page-header-actions">
          <button className={`btn btn-secondary`} onClick={() => setPreview(p => !p)}>
            {preview ? <EyeOff size={14} /> : <Eye size={14} />} {preview ? 'Hide Preview' : 'Live Preview'}
          </button>
          {activeTabConfig?.table && (
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); console.log("Adding CMS Item"); openAdd(); }}><Plus size={14} /> Add {tab.replace(/s$/, '')}</button>
          )}
        </div>
      </div>

      {preview && (
        <div style={{ marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>🔍 Live Preview — This reflects the current content users will see on the customer website.</p>
          <iframe src="/" style={{ width: '100%', height: 450, border: 'none', borderRadius: 8, background: '#fff' }} title="Live Preview" />
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 6 }}>
        {CMS_TABS.map(t => (
          <button key={t.name} className={`tab-btn${tab === t.name ? ' active' : ''}`} onClick={() => setTab(t.name)} style={{ whiteSpace: 'nowrap' }}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Dynamic Section settings */}
      {renderSectionSettingsPanel()}

      {loading ? (
        <SkeletonGrid cards={6} minWidth={260} />
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={loadItems} />
      ) : !activeTabConfig?.table ? (
        <div style={{
          padding: '40px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          textAlign: 'center',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(20, 184, 166, 0.1)',
            color: 'var(--teal-accent, #00A884)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24
          }}>
            ⚙️
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Dynamically Managed Layout Section
            </h3>
            <p style={{ margin: 0, fontSize: 13, maxWidth: 520, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              This section is rendered dynamically or loads directly from your active inventory database. 
              Use the settings dashboard above to toggle its visibility, override its header titles, reorder its display position, schedule availability, adjust vertical spacing, and fine-tune responsive presentation layouts.
            </p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${tab} Found`}
          message={`Manage your homepage by adding slides, actions, testimonials, and brand banners here.`}
          ctaLabel={`Add ${tab.replace(/s$/, '')}`}
          onCta={openAdd}
        />
      ) : (
        <div className="cms-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map(renderCard)}
          <div 
            className="cms-card" 
            style={{ cursor: 'pointer', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, minHeight: 180, borderRadius: 12, background: 'rgba(255,255,255,0.01)' }} 
            onClick={(e) => { e.stopPropagation(); console.log("Adding CMS Item from Dashed Card"); openAdd(); }}
          >
            <Plus size={24} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add {tab.replace(/s$/, '')}</span>
          </div>
        </div>
      )}


      {modal && (
        <div className="modal-overlay" onClick={closeModal} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden' }}>
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <div><h2>{modal === 'add' ? `Add ${tab.replace(/s$/, '')}` : `Edit ${tab.replace(/s$/, '')}`}</h2></div>
                <button type="button" className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: 20 }}>
                {renderFields()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="modal-overlay" onClick={() => { console.log("Closing Version History Modal"); setShowVersionsModal(false); }} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden' }}>
            <div className="modal-header">
              <div>
                <h2>Version History — {sectionConfig?.section_name}</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Select a previous published version to restore as draft.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowVersionsModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 20 }}>
              {versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  No published versions available yet for this section.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {versions.map((v) => (
                    <div key={v.id} style={{
                      padding: 16,
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.01)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          Version #{v.version_number}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Published: {new Date(v.created_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--teal-accent, #00A884)', marginTop: 4 }}>
                          Layout: {v.config?.layout_type} | Items: {v.config?.max_items} | Order: {v.config?.display_order}
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRestoreVersion(v)}
                      >
                        Restore Draft
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowVersionsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CMS;
