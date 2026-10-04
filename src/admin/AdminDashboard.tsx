import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import {
  supabase,
  isFrontendSupabaseConfigured,
  insertOrUpdateProductInSupabase,
  deleteProductInSupabase,
  insertOrUpdateCategoryInSupabase,
  deleteCategoryInSupabase,
  uploadImageDirectlyToSupabaseStorage,
} from '../lib/supabaseClient';
import {
  Product,
  Category,
  Order,
  OrderStatus,
  PaymentStatus,
  HeroBanner,
  Coupon,
  StoreSettings,
  B2BInquiry,
  AuditLog,
  StaffUser,
  AdminSecuritySettings,
  InventoryLedgerEntry,
  CustomerProfile,
} from '../types';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Sliders,
  Tag,
  Settings,
  ShieldCheck,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Lock,
  DollarSign,
  Users,
  MessageSquare,
  KeyRound,
  ShieldAlert,
  UserPlus,
  ArrowLeft,
  Database,
  Upload,
  Image as ImageIcon,
  Clock,
  Printer,
  Layers,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { PrintReceiptModal } from '../components/common/PrintReceiptModal';
import { InventoryTab } from './InventoryTab';
import { CustomersTab } from './CustomersTab';
import { AnalyticsTab } from './AnalyticsTab';

export const AdminDashboard: React.FC = () => {
  const { products, categories, refreshProducts, refreshCategories, refreshBanners, refreshSettings, showToast } = useStore();

  // Authentication State
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('ma_admin_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem('ma_admin_token')));
  const [adminUser, setAdminUser] = useState<string>(() => localStorage.getItem('ma_admin_user') || '');
  const [adminRole, setAdminRole] = useState<string>(() => localStorage.getItem('ma_admin_role') || '');
  const [loginMethod, setLoginMethod] = useState<'secret' | 'credentials'>('secret');
  const [masterSecretInput, setMasterSecretInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Admin Section
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'products'
    | 'categories'
    | 'inventory'
    | 'orders'
    | 'customers'
    | 'analytics'
    | 'banners'
    | 'coupons'
    | 'inquiries'
    | 'settings'
    | 'ai-assistant'
    | 'audit-logs'
    | 'security'
  >('overview');

  // Admin Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [inquiries, setInquiries] = useState<B2BInquiry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [inventoryLedger, setInventoryLedger] = useState<InventoryLedgerEntry[]>([]);
  const [customersList, setCustomersList] = useState<CustomerProfile[]>([]);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [adminSettings, setAdminSettings] = useState<StoreSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<AdminSecuritySettings | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);

  // Item Deletion Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'product' | 'category' | 'order' | 'banner' | 'coupon' | 'inquiry' | 'staff';
    id: string;
    title: string;
    subtitle?: string;
    warning?: string;
    blocked?: boolean;
    productCount?: number;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Product Edit/Add Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Edit/Add Modal
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);
  const [categoryImageUploadError, setCategoryImageUploadError] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  // Receipt Logo Upload State
  const receiptLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingReceiptLogo, setIsUploadingReceiptLogo] = useState(false);
  const [receiptLogoUploadError, setReceiptLogoUploadError] = useState<string | null>(null);

  // Banner Modal
  const [editingBanner, setEditingBanner] = useState<Partial<HeroBanner> | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // Coupon Modal
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  // Staff Modal
  const [editingStaff, setEditingStaff] = useState<Partial<StaffUser> | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Master Secret Change Form
  const [newMasterSecret, setNewMasterSecret] = useState('');
  const [confirmMasterSecret, setConfirmMasterSecret] = useState('');
  const [masterSecretSuccess, setMasterSecretSuccess] = useState('');
  const [masterSecretError, setMasterSecretError] = useState('');

  // Selected Order for detail view / status update
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState<'product_description' | 'seo_meta' | 'inventory_insight'>('product_description');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Search & Filters in tables
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Configurable Low Stock Threshold (Default: 5 units)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  // Product Filters
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [productActiveFilter, setProductActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [productFeaturedFilter, setProductFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');

  // Order Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Helper for authenticated requests
  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    const token = adminToken || localStorage.getItem('ma_admin_token') || '';
    if (token) {
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  };

  // Check existing session
  useEffect(() => {
    const token = localStorage.getItem('ma_admin_token') || '';
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/auth/admin-verify', { headers, credentials: 'include' })
      .then((r) => safeJsonResponse(r, { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminUser(data.username);
          setAdminRole(data.role);
          localStorage.setItem('ma_admin_user', data.username);
          localStorage.setItem('ma_admin_role', data.role);
          loadAdminData();
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        if (token) loadAdminData();
      });
  }, []);

  const loadAdminData = async () => {
    try {
      await Promise.all([refreshProducts(), refreshCategories()]);
      const [ordRes, banRes, coupRes, inqRes, logRes, anaRes, setRes, ledgRes, custRes] = await Promise.all([
        adminFetch('/api/orders').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/banners').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/coupons').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/inquiries').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/admin/audit-logs').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/admin/analytics').then((r) => safeJsonResponse(r, {})),
        adminFetch('/api/settings').then((r) => safeJsonResponse(r, {})),
        adminFetch('/api/admin/inventory/ledger').then((r) => safeJsonResponse(r, [])),
        adminFetch('/api/admin/customers').then((r) => safeJsonResponse(r, [])),
      ]);

      if (Array.isArray(ordRes)) setOrders(ordRes);
      if (Array.isArray(banRes)) setBanners(banRes);
      if (Array.isArray(coupRes)) setCoupons(coupRes);
      if (Array.isArray(inqRes)) setInquiries(inqRes);
      if (Array.isArray(logRes)) setAuditLogs(logRes);
      if (anaRes && !anaRes.error) setAnalytics(anaRes);
      if (setRes && !setRes.error) setAdminSettings(setRes);
      if (Array.isArray(ledgRes)) setInventoryLedger(ledgRes);
      if (Array.isArray(custRes)) setCustomersList(custRes);

      // Fetch persistent database status
      adminFetch('/api/database/status')
        .then((r) => safeJsonResponse(r, null))
        .then((st) => {
          if (st && !st.error) setDbStatus(st);
        })
        .catch(() => {});

      // Load security if superadmin or admin
      adminFetch('/api/admin/security')
        .then((r) => safeJsonResponse(r, null))
        .then((secData) => {
          if (secData && !secData.error) {
            setSecuritySettings(secData);
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const payload: any = {};
      if (loginMethod === 'secret') {
        payload.masterSecret = masterSecretInput;
      } else {
        payload.username = adminEmailInput;
        payload.password = adminPassInput;
      }

      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeJsonResponse(res, {
        error: 'Authentication failed',
        message: `Server returned non-JSON response (${res.status}). Verify Netlify Functions are active.`,
      });

      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || 'Authentication failed.');
      }

      if (data.token) {
        localStorage.setItem('ma_admin_token', data.token);
        localStorage.setItem('ma_admin_user', data.username);
        localStorage.setItem('ma_admin_role', data.role);
        setAdminToken(data.token);
      }

      setIsAuthenticated(true);
      setAdminUser(data.username);
      setAdminRole(data.role);
      showToast(`Welcome back, ${data.username}`, 'success');
      loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials or Master Secret');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/auth/admin-logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('ma_admin_token');
    localStorage.removeItem('ma_admin_user');
    localStorage.removeItem('ma_admin_role');
    setAdminToken('');
    setIsAuthenticated(false);
    setAdminUser('');
    setAdminRole('');
    showToast('Logged out of Admin Portal', 'info');
  };

  // Product CRUD
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);

    // Validate type: JPG, JPEG, PNG, WEBP
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isMimeValid =
      validExtensions.includes(file.type.toLowerCase()) ||
      ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt || '');

    if (!isMimeValid) {
      const err = 'Invalid format. Please choose a JPG, JPEG, PNG, or WEBP image file.';
      setImageUploadError(err);
      showToast(err, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      const err = 'Image file size must be less than 8MB.';
      setImageUploadError(err);
      showToast(err, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingImage(true);

    try {
      // 1. Try direct upload to Supabase Storage first if frontend client is configured
      if (isFrontendSupabaseConfigured && supabase) {
        const directUpload = await uploadImageDirectlyToSupabaseStorage(file, 'product-images');
        if (directUpload.ok && directUpload.publicUrl) {
          setEditingProduct((prev) =>
            prev ? { ...prev, images: [directUpload.publicUrl!], image_url: directUpload.publicUrl!, imageUrl: directUpload.publicUrl! } : null
          );
          setImageUploadError(null);
          showToast('Image uploaded and stored in Supabase Storage.', 'success');
          setIsUploadingImage(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      // 2. Upload via backend /api/upload endpoint
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await adminFetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64Data,
              contentType: file.type || 'image/jpeg',
            }),
          });

          const data = await safeJsonResponse(res, { success: false, error: 'Upload failed' });
          if (!res.ok || !data.success || !data.url) {
            throw new Error(data.error || 'Failed to upload image to Supabase Storage');
          }

          // Update image URL in editing product
          setEditingProduct((prev) =>
            prev ? { ...prev, images: [data.url], image_url: data.url, imageUrl: data.url } : null
          );
          setImageUploadError(null);
          showToast('Image uploaded and stored in Supabase Storage.', 'success');
        } catch (err: any) {
          const errMsg = err.message || 'Error uploading image to Supabase Storage';
          setImageUploadError(errMsg);
          showToast(errMsg, 'error');
        } finally {
          setIsUploadingImage(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        setIsUploadingImage(false);
        setImageUploadError('Failed to read image file from device.');
        showToast('Failed to read image file', 'error');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingImage(false);
      setImageUploadError(err.message || 'Failed reading image file');
      showToast(err.message || 'Failed reading image file', 'error');
    }
  };

  const handleRemoveImage = () => {
    setEditingProduct((prev) => (prev ? { ...prev, images: [], image_url: '', imageUrl: '' } : null));
    setImageUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !String(editingProduct.name).trim()) {
      showToast('Product could not be saved: Product title is required.', 'error');
      return;
    }

    const numPrice = Number(editingProduct.price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Product could not be saved: Valid price in PKR is required.', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const isNew = !editingProduct.id;
      const productId = editingProduct.id || 'prod-' + Date.now();
      const primaryImg =
        editingProduct.images?.[0] ||
        editingProduct.image_url ||
        editingProduct.imageUrl ||
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80';

      const productPayload: Product = {
        id: productId,
        name: editingProduct.name.trim(),
        slug:
          editingProduct.slug ||
          editingProduct.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        sku: editingProduct.sku || `MAG-${Date.now().toString().slice(-5)}`,
        categoryId: editingProduct.categoryId || categories[0]?.id || 'cat-solar',
        categoryName: editingProduct.categoryName || categories[0]?.name || 'Solar Products & Equipment',
        brand: editingProduct.brand || 'M.A. Certified',
        price: numPrice,
        salePrice: editingProduct.salePrice ? Number(editingProduct.salePrice) : undefined,
        costPrice: editingProduct.costPrice ? Number(editingProduct.costPrice) : undefined,
        stock: Number(editingProduct.stock ?? 0),
        lowStockThreshold: Number(editingProduct.lowStockThreshold ?? 5),
        warranty: editingProduct.warranty || 'Official M.A. Group Warranty',
        description: editingProduct.description || '',
        shortDescription:
          editingProduct.shortDescription ||
          (editingProduct.description ? String(editingProduct.description).slice(0, 140) : ''),
        images: [primaryImg],
        image_url: primaryImg,
        imageUrl: primaryImg,
        features: Array.isArray(editingProduct.features)
          ? editingProduct.features
          : ['High performance', 'Official Warranty'],
        specifications: editingProduct.specifications || [{ key: 'Warranty', value: 'Manufacturer Warranty' }],
        tags: Array.isArray(editingProduct.tags) ? editingProduct.tags : ['equipment'],
        status: editingProduct.status || 'active',
        isFeatured: Boolean(editingProduct.isFeatured),
        isBestSeller: Boolean(editingProduct.isBestSeller),
        rating: editingProduct.rating || 5.0,
        reviewCount: editingProduct.reviewCount || 1,
        createdAt: editingProduct.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Direct Supabase INSERT/UPDATE if frontend client is configured
      let savedViaDirectSupabase = false;
      let directSupabaseError: string | undefined;
      if (isFrontendSupabaseConfigured && supabase) {
        const directRes = await insertOrUpdateProductInSupabase(productPayload, products);
        if (directRes.ok) {
          savedViaDirectSupabase = true;
        } else {
          directSupabaseError = directRes.error;
        }
      }

      // 2. Also call backend API endpoint to persist via service-role key and sync server state
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/products' : `/api/products/${editingProduct.id}`;

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      });

      const resData = await safeJsonResponse(res, null);

      if (!res.ok && !savedViaDirectSupabase) {
        const errorMsg =
          resData?.error ||
          resData?.message ||
          directSupabaseError ||
          'Supabase database connection error.';
        const formattedErr = errorMsg.startsWith('Product could not be saved:')
          ? errorMsg
          : `Product could not be saved: ${errorMsg}`;
        throw new Error(formattedErr);
      }

      await refreshProducts();
      await loadAdminData();
      setIsProductModalOpen(false);
      setEditingProduct(null);
      showToast('Product saved successfully.', 'success');
    } catch (err: any) {
      const msg = err.message || 'Unknown Supabase error';
      showToast(
        msg.startsWith('Product could not be saved:') ? msg : `Product could not be saved: ${msg}`,
        'error'
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Prompt Product Deletion Modal
  const promptDeleteProduct = (p: Product) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'product',
      id: p.id,
      title: p.name,
      subtitle: `SKU: ${p.sku} • Price: Rs. ${p.price.toLocaleString()} • Category: ${p.categoryName || p.categoryId}`,
    });
  };

  // Prompt Category Deletion Modal with Product Dependency Protection
  const promptDeleteCategory = (cat: Category) => {
    setDeleteModalError(null);
    const relatedProducts = products.filter(
      (p) => p.categoryId === cat.id || (p.categoryName && p.categoryName.toLowerCase() === cat.name.toLowerCase())
    );
    const hasProducts = relatedProducts.length > 0;
    setDeleteConfirmation({
      type: 'category',
      id: cat.id,
      title: cat.name,
      subtitle: `Slug: /category/${cat.slug}`,
      blocked: hasProducts,
      productCount: relatedProducts.length,
      warning: hasProducts
        ? `Cannot delete category "${cat.name}": ${relatedProducts.length} active product(s) in your catalog belong to this category (e.g. "${relatedProducts[0].name}"). To protect your store catalog, please reassign or delete these products first.`
        : undefined,
    });
  };

  const handleDeleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (prod) promptDeleteProduct(prod);
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) promptDeleteCategory(cat);
  };

  // Unified Deletion Executor
  const executeDelete = async () => {
    if (!deleteConfirmation || deleteConfirmation.blocked) return;

    setIsDeletingItem(true);
    setDeleteModalError(null);

    const { type, id } = deleteConfirmation;

    try {
      let endpoint = '';
      if (type === 'product') endpoint = `/api/products/${id}`;
      else if (type === 'category') endpoint = `/api/categories/${id}`;
      else if (type === 'order') endpoint = `/api/orders/${id}`;
      else if (type === 'banner') endpoint = `/api/banners/${id}`;
      else if (type === 'coupon') endpoint = `/api/coupons/${id}`;
      else if (type === 'inquiry') endpoint = `/api/inquiries/${id}`;
      else if (type === 'staff') endpoint = `/api/admin/security/staff/${id}`;

      let deletedDirectly = false;
      if (isFrontendSupabaseConfigured && supabase) {
        if (type === 'product') {
          const dRes = await deleteProductInSupabase(id, products);
          if (dRes.ok) deletedDirectly = true;
        } else if (type === 'category') {
          const dRes = await deleteCategoryInSupabase(id, categories);
          if (dRes.ok) deletedDirectly = true;
        }
      }

      const res = await adminFetch(endpoint, { method: 'DELETE' });
      const data = await safeJsonResponse(res, null);

      if ((!res.ok || (data && data.success === false)) && !deletedDirectly) {
        const errorMsg = data?.error || data?.message || `Failed to delete ${type}. Please check server connection.`;
        setDeleteModalError(errorMsg);
        showToast(errorMsg, 'error');
        setIsDeletingItem(false);
        return;
      }

      // Success confirmed by database
      setDeleteConfirmation(null);
      setIsDeletingItem(false);

      if (type === 'product') {
        await refreshProducts();
        await loadAdminData();
      } else if (type === 'category') {
        await refreshCategories();
        await loadAdminData();
      } else if (type === 'order') {
        await loadAdminData();
        if (selectedOrder && selectedOrder.id === id) setSelectedOrder(null);
      } else if (type === 'banner') {
        await refreshBanners();
        await loadAdminData();
      } else if (type === 'coupon') {
        await loadAdminData();
      } else if (type === 'inquiry') {
        await loadAdminData();
      } else if (type === 'staff') {
        await loadAdminData();
      }

      showToast('Deleted successfully.', 'success');
    } catch (err: any) {
      const errorMsg = err.message || `An error occurred while deleting ${type}.`;
      setDeleteModalError(errorMsg);
      showToast(errorMsg, 'error');
      setIsDeletingItem(false);
    }
  };

  // Category CRUD
  const handleCategoryImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
      const err = 'Please select a valid image file (JPG, JPEG, PNG, or WEBP).';
      setCategoryImageUploadError(err);
      showToast(err, 'error');
      if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      const err = 'Image file size must be less than 8MB.';
      setCategoryImageUploadError(err);
      showToast(err, 'error');
      if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
      return;
    }

    setIsUploadingCategoryImage(true);
    setCategoryImageUploadError(null);

    if (isFrontendSupabaseConfigured && supabase) {
      const directRes = await uploadImageDirectlyToSupabaseStorage(file, 'product-images');
      if (directRes.ok && directRes.publicUrl) {
        setEditingCategory((prev) => (prev ? { ...prev, image: directRes.publicUrl! } : null));
        setCategoryImageUploadError(null);
        showToast('Category image uploaded to Supabase Storage.', 'success');
        setIsUploadingCategoryImage(false);
        if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await adminFetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `category-${file.name}`,
            fileData: base64Data,
            contentType: file.type || 'image/jpeg',
          }),
        });

        const data = await safeJsonResponse(res, { success: false, error: 'Upload failed' });
        if (!res.ok || !data.success || !data.url) {
          throw new Error(data.error || 'Failed to upload category image to Supabase Storage');
        }

        setEditingCategory((prev) => (prev ? { ...prev, image: data.url } : null));
        setCategoryImageUploadError(null);
        showToast('Category image uploaded to Supabase Storage.', 'success');
      } catch (err: any) {
        const errMsg = err.message || 'Error uploading category image to Supabase Storage';
        setCategoryImageUploadError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setIsUploadingCategoryImage(false);
        if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setIsUploadingCategoryImage(false);
      setCategoryImageUploadError('Failed to read image file from device.');
      showToast('Failed to read image file', 'error');
    };

    reader.readAsDataURL(file);
  };

  const handleAddSubcategory = () => {
    if (!newSubcategoryName.trim() || !editingCategory) return;
    const name = newSubcategoryName.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newSub = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      categoryId: editingCategory.id || 'cat-general',
      name,
      slug,
      description: '',
      image: '',
      displayOrder: (editingCategory.subcategories?.length || 0) + 1,
      isActive: true,
    };
    setEditingCategory({
      ...editingCategory,
      subcategories: [...(editingCategory.subcategories || []), newSub],
    });
    setNewSubcategoryName('');
  };

  const handleRemoveSubcategory = (subId: string) => {
    if (!editingCategory) return;
    setEditingCategory({
      ...editingCategory,
      subcategories: (editingCategory.subcategories || []).filter((s) => s.id !== subId),
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) {
      showToast('Category name is required.', 'error');
      return;
    }

    setIsSavingCategory(true);
    try {
      const isNew = !editingCategory.id;
      const catPayload: Category = {
        id: editingCategory.id || 'cat-' + Date.now(),
        name: editingCategory.name.trim(),
        slug:
          editingCategory.slug ||
          editingCategory.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        description: editingCategory.description || '',
        image: editingCategory.image || '',
        iconName: editingCategory.iconName || 'Zap',
        displayOrder: Number(editingCategory.displayOrder) || 0,
        isActive: editingCategory.isActive !== false,
        subcategories: editingCategory.subcategories || [],
      };

      let savedCatDirect = false;
      if (isFrontendSupabaseConfigured && supabase) {
        const directRes = await insertOrUpdateCategoryInSupabase(catPayload, categories);
        if (directRes.ok) savedCatDirect = true;
      }

      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/categories' : `/api/categories/${editingCategory.id}`;

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catPayload),
      });

      if (!res.ok && !savedCatDirect) {
        const errData = await safeJsonResponse(res, { error: 'Failed to save category' });
        throw new Error(errData.error || 'Failed to save category');
      }

      await refreshCategories();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      showToast(isNew ? 'Category created and persisted to Supabase.' : 'Category updated in Supabase.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Banner CRUD
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title) return;

    try {
      const isNew = !editingBanner.id;
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/banners' : `/api/banners/${editingBanner.id}`;

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBanner),
      });

      if (!res.ok) throw new Error('Failed to save banner');

      await refreshBanners();
      await loadAdminData();
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      showToast('Hero banner saved successfully.', 'success');
    } catch {
      showToast('Failed to save banner', 'error');
    }
  };

  const promptDeleteBanner = (b: HeroBanner) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'banner',
      id: b.id,
      title: b.title,
      subtitle: `Hero Carousel Banner • ${b.subtitle || 'Home Top'}`,
    });
  };

  const handleDeleteBanner = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (banner) promptDeleteBanner(banner);
  };

  // Coupon CRUD
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon || !editingCoupon.code || !editingCoupon.discountValue) return;

    try {
      const res = await adminFetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingCoupon,
          code: editingCoupon.code.toUpperCase().trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save coupon');

      await loadAdminData();
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
      showToast('Coupon saved successfully.', 'success');
    } catch {
      showToast('Failed to save coupon', 'error');
    }
  };

  const promptDeleteCoupon = (c: Coupon) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'coupon',
      id: c.id,
      title: `Coupon: ${c.code}`,
      subtitle: `Discount: ${c.discountType === 'percentage' ? `${c.discountValue}%` : `Rs. ${c.discountValue}`}`,
    });
  };

  const handleDeleteCoupon = (id: string) => {
    const c = coupons.find((item) => item.id === id);
    if (c) promptDeleteCoupon(c);
  };

  // Order Deletion
  const promptDeleteOrder = (ord: Order) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'order',
      id: ord.id,
      title: `Order #${ord.orderNumber}`,
      subtitle: `Customer: ${ord.customer.fullName} • City: ${ord.customer.city} • Total: Rs. ${ord.grandTotal.toLocaleString()} • Status: ${ord.status}`,
    });
  };

  const handleDeleteOrder = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (order) promptDeleteOrder(order);
  };

  // Inquiry Deletion
  const promptDeleteInquiry = (inq: B2BInquiry) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'inquiry',
      id: inq.id,
      title: `Quotation Inquiry from ${inq.companyName || inq.contactPerson}`,
      subtitle: `Email: ${inq.email} • Phone: ${inq.phone}`,
    });
  };

  const handleDeleteInquiry = (id: string) => {
    const inq = inquiries.find((i) => i.id === id);
    if (inq) promptDeleteInquiry(inq);
  };

  // Super Admin: Update Master Secret
  const handleUpdateMasterSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterSecretError('');
    setMasterSecretSuccess('');

    if (!newMasterSecret || newMasterSecret.length < 4) {
      setMasterSecretError('New Master Secret must be at least 4 characters long.');
      return;
    }
    if (newMasterSecret !== confirmMasterSecret) {
      setMasterSecretError('Passwords do not match.');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/security/master-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSecret: newMasterSecret }),
      });
      const data = await safeJsonResponse(res, { error: 'Failed to update Master Secret' });
      if (!res.ok) throw new Error(data.error || 'Failed to update Master Secret');

      setMasterSecretSuccess('Master Secret updated successfully! Remember to use this new secret on next login.');
      setNewMasterSecret('');
      setConfirmMasterSecret('');
      showToast('Master Secret updated.', 'success');
      loadAdminData();
    } catch (err: any) {
      setMasterSecretError(err.message || 'Error updating Master Secret');
    }
  };

  // Super Admin: Staff CRUD
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.email || !editingStaff.password || !editingStaff.name) {
      showToast('Name, email, and password are required.', 'error');
      return;
    }

    try {
      const isNew = !editingStaff.id;
      const endpoint = isNew ? '/api/admin/security/staff' : `/api/admin/security/staff/${editingStaff.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStaff),
      });

      const data = await safeJsonResponse(res, { error: 'Failed to save staff' });
      if (!res.ok) throw new Error(data.error || 'Failed to save staff');

      setIsStaffModalOpen(false);
      setEditingStaff(null);
      showToast(`Staff member ${isNew ? 'added' : 'updated'}.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Error saving staff member', 'error');
    }
  };

  const promptDeleteStaff = (st: StaffUser) => {
    setDeleteModalError(null);
    setDeleteConfirmation({
      type: 'staff',
      id: st.id,
      title: `Staff Member: ${st.name || st.email}`,
      subtitle: `Email: ${st.email} • Role: ${st.role.toUpperCase()}`,
    });
  };

  const handleDeleteStaff = (id: string) => {
    const st = securitySettings?.staffList?.find((s: StaffUser) => s.id === id);
    if (st) {
      promptDeleteStaff(st);
    } else {
      setDeleteModalError(null);
      setDeleteConfirmation({
        type: 'staff',
        id,
        title: `Staff Member ID: ${id}`,
      });
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentStatus,
    trackingNumber?: string,
    courierName?: string
  ) => {
    try {
      const res = await adminFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paymentStatus, trackingNumber, courierName }),
      });
      const updated = await safeJsonResponse(res, null);
      if (res.ok && updated && !updated.error) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
        await refreshProducts();
        await loadAdminData();
        showToast(`Order status updated to "${status}".`, 'success');
      } else {
        showToast(updated?.error || 'Failed to update status.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.', 'error');
    }
  };

  // AI Assistant in Admin
  const handleGenerateAi = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await adminFetch('/api/ai/admin-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, type: aiType }),
      });
      const data = await safeJsonResponse(res, { result: 'Error generating AI insight.' });
      setAiResult(data.result);
    } catch {
      setAiResult('Error generating AI insight.');
    } finally {
      setAiLoading(false);
    }
  };

  // If Not Authenticated: Render Secure Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center font-black text-2xl shadow-lg">
              M.A.
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">
              Management Portal
            </h1>
            <p className="text-xs text-neutral-400">
              Restricted to authorized M.A. GROUP OF COMPANIES personnel.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Mode Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-bold">
            <button
              onClick={() => {
                setLoginMethod('secret');
                setLoginError('');
              }}
              className={`py-2 rounded-lg transition-colors ${
                loginMethod === 'secret' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Master Secret
            </button>
            <button
              onClick={() => {
                setLoginMethod('credentials');
                setLoginError('');
              }}
              className={`py-2 rounded-lg transition-colors ${
                loginMethod === 'credentials' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Staff Credentials
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {loginMethod === 'secret' ? (
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-bold uppercase tracking-wider block">
                  Administrator Master Secret
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={masterSecretInput}
                    onChange={(e) => setMasterSecretInput(e.target.value)}
                    placeholder="Enter Master Secret..."
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="text-[10px] text-neutral-400 leading-normal">
                  Superadmin mode grants unrestricted access to all website settings, catalog items, and staff credential management.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-bold">Staff Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="name@magroup.pk"
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-300 font-bold">Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? 'Authenticating...' : 'AUTHENTICATE & ENTER'}
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-800 text-center">
            <button
              onClick={() => {
                window.location.hash = '#/';
              }}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              &larr; Return to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Products for Admin Table
  const filteredAdminProducts = products.filter((p) => {
    // 1. Search Query
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // 2. Category Filter
    if (productCategoryFilter !== 'all') {
      const matchesCat =
        p.categoryId === productCategoryFilter ||
        (p.categoryName && p.categoryName.toLowerCase() === productCategoryFilter.toLowerCase());
      if (!matchesCat) return false;
    }

    // 3. Stock Status Filter
    const threshold = p.lowStockThreshold || lowStockThreshold;
    if (productStockFilter === 'out_of_stock' && p.stock > 0) return false;
    if (productStockFilter === 'low_stock' && (p.stock <= 0 || p.stock > threshold)) return false;
    if (productStockFilter === 'in_stock' && p.stock <= threshold) return false;

    // 4. Active / Inactive Filter
    if (productActiveFilter === 'active' && p.status === 'inactive') return false;
    if (productActiveFilter === 'inactive' && p.status !== 'inactive') return false;

    // 5. Featured Filter
    if (productFeaturedFilter === 'featured' && !p.isFeatured) return false;
    if (productFeaturedFilter === 'standard' && p.isFeatured) return false;

    return true;
  });

  // Filtered Categories for Admin Table
  const filteredAdminCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  // Filtered Orders for Admin Table
  const filteredAdminOrders = orders.filter((o) => {
    // 1. Search Query
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matches =
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        (o.customer.whatsappNumber && o.customer.whatsappNumber.includes(q)) ||
        o.customer.city.toLowerCase().includes(q) ||
        (o.customer.addressLine && o.customer.addressLine.toLowerCase().includes(q)) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // 2. Status Filter
    if (orderStatusFilter !== 'all') {
      if (o.status.toLowerCase() !== orderStatusFilter.toLowerCase()) return false;
    }

    // 3. Date Filter
    if (orderDateFilter !== 'all' && o.createdAt) {
      const orderDate = new Date(o.createdAt);
      const now = new Date();
      if (orderDateFilter === 'today') {
        if (orderDate.toDateString() !== now.toDateString()) return false;
      } else if (orderDateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (orderDate < weekAgo) return false;
      } else if (orderDateFilter === 'month') {
        if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-neutral-900 border-r border-neutral-800 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo & User */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-lg">
              M.A.
            </div>
            <div>
              <div className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>Admin Console</span>
                {adminRole === 'superadmin' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black tracking-normal">
                    SUPER ADMIN
                  </span>
                )}
              </div>
              <div className="text-[11px] text-amber-500 font-semibold truncate max-w-[140px]">{adminUser}</div>
              {adminRole === 'superadmin' && (
                <div className="text-[9px] text-emerald-400/80 font-medium">Full Master Access Granted</div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventory &amp; Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders &amp; COD ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Customers &amp; CRM ({customersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics &amp; Profit</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'banners'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Hero Slider Banners</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons &amp; Deals ({coupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inquiries')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'inquiries'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>B2B Quotations ({inquiries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Store &amp; COD Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Master Secret &amp; Staff</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                SUPER
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai-assistant')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'ai-assistant'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Operations Advisor</span>
            </button>

            <button
              onClick={() => setActiveTab('audit-logs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'audit-logs'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Security &amp; Audit Logs</span>
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-neutral-800 space-y-2 text-xs">
          <button
            onClick={() => {
              window.location.hash = '#/';
            }}
            className="w-full text-left text-neutral-400 hover:text-white py-1.5 px-2 rounded-lg"
          >
            &larr; View Public Store
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-rose-400 hover:text-rose-300 py-2 px-2 rounded-lg cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Operations &amp; Sales Summary</h2>
                <p className="text-xs text-neutral-400 mt-1">Live metrics across Pakistan deliveries and warehouse inventory.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs flex items-center gap-2">
                  <span className="text-neutral-400">Low-Stock Alert:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value)))}
                    className="w-14 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-400 font-bold text-center text-xs"
                  />
                  <span className="text-neutral-500">units</span>
                </div>
              </div>
            </div>

            {/* 6 Metric KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Total Orders */}
              <div
                onClick={() => {
                  setOrderStatusFilter('all');
                  setActiveTab('orders');
                }}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Orders</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">{orders.length}</div>
                <div className="text-[10px] text-neutral-400">All registered orders</div>
              </div>

              {/* 2. Pending Orders */}
              <div
                onClick={() => {
                  setOrderStatusFilter('Pending');
                  setActiveTab('orders');
                }}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Pending Orders</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {orders.filter((o) => o.status.toLowerCase().includes('pending')).length}
                </div>
                <div className="text-[10px] text-amber-400/80">Awaiting verification</div>
              </div>

              {/* 3. Total Products */}
              <div
                onClick={() => setActiveTab('products')}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Products</span>
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">{products.length}</div>
                <div className="text-[10px] text-neutral-400">In catalog</div>
              </div>

              {/* 4. Low Stock Products */}
              <div
                onClick={() => {
                  setProductStockFilter('low_stock');
                  setActiveTab('products');
                }}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Low Stock</span>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400">
                  {products.filter((p) => p.stock <= (p.lowStockThreshold || lowStockThreshold)).length}
                </div>
                <div className="text-[10px] text-rose-400/80">&le; {lowStockThreshold} units left</div>
              </div>

              {/* 5. Total Categories */}
              <div
                onClick={() => setActiveTab('categories')}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Categories</span>
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">{categories.length}</div>
                <div className="text-[10px] text-neutral-400">Active departments</div>
              </div>

              {/* 6. Delivered Orders */}
              <div
                onClick={() => {
                  setOrderStatusFilter('Delivered');
                  setActiveTab('orders');
                }}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Delivered Orders</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {orders.filter((o) => o.status.toLowerCase().includes('delivered')).length}
                </div>
                <div className="text-[10px] text-emerald-400/80">Completed COD</div>
              </div>
            </div>

            {/* Low-Stock Products Warning Table */}
            {products.filter((p) => p.stock <= (p.lowStockThreshold || lowStockThreshold)).length > 0 && (
              <div className="p-5 rounded-2xl bg-neutral-900 border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Low Stock Warning ({products.filter((p) => p.stock <= (p.lowStockThreshold || lowStockThreshold)).length} Items)
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Products with stock quantity at or below threshold ({lowStockThreshold} units) require re-ordering.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProductStockFilter('low_stock');
                      setActiveTab('products');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                  >
                    View All in Catalog &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                      <tr>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-center">Remaining Stock</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {products
                        .filter((p) => p.stock <= (p.lowStockThreshold || lowStockThreshold))
                        .slice(0, 5)
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-neutral-800/40">
                            <td className="p-2.5 font-mono text-neutral-400">{p.sku}</td>
                            <td className="p-2.5 font-bold text-white max-w-xs truncate">{p.name}</td>
                            <td className="p-2.5 text-neutral-400">{p.categoryName || p.categoryId}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-black text-xs ${
                                  p.stock <= 0
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {p.stock <= 0 ? 'Out of Stock (0)' : `${p.stock} left`}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-white">Rs. {p.price.toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-[11px] cursor-pointer"
                              >
                                Edit Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Orders Overview */}
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Orders (Cash on Delivery)</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  View All Orders &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">City</th>
                      <th className="p-3 text-right">Amount (PKR)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">COD Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-neutral-800/50">
                        <td className="p-3 font-mono font-bold text-amber-400">{o.orderNumber}</td>
                        <td className="p-3">{o.customer.fullName}</td>
                        <td className="p-3 text-neutral-400">{o.customer.city}</td>
                        <td className="p-3 text-right font-bold text-white">Rs. {o.grandTotal.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] text-neutral-300 font-semibold">{o.paymentStatus}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400"
                            title="View Order"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Products Management</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Create, edit, or adjust pricing and stock for any equipment.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    name: '',
                    sku: 'MAG-' + Math.floor(1000 + Math.random() * 9000),
                    categoryId: categories[0]?.id || 'cat-solar',
                    categoryName: categories[0]?.name || 'Solar',
                    brand: 'Inverex Solar Energy',
                    price: 25000,
                    stock: 10,
                    lowStockThreshold: 2,
                    warranty: '2 Years Warranty',
                    description: '',
                    shortDescription: '',
                    images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'],
                  });
                  setIsProductModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            {/* Supabase Persistence Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    dbStatus?.supabase?.tableExists
                      ? 'bg-emerald-400 animate-pulse'
                      : dbStatus?.supabase?.configured
                      ? 'bg-amber-400'
                      : 'bg-neutral-500'
                  }`}
                />
                <span className="font-bold text-white">
                  Database Persistence:{' '}
                  {dbStatus?.supabase?.tableExists
                    ? 'Supabase Table "products" Active & Synced'
                    : dbStatus?.supabase?.configured
                    ? 'Supabase Ready (Persistent Storage Active)'
                    : 'Persistent Storage Active'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-950 text-neutral-300 font-mono border border-neutral-800">
                  {products.length} products stored
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {dbStatus?.supabase?.tableExists
                    ? 'All catalog changes sync permanently to remote Supabase database.'
                    : 'Catalog safe in persistent storage. Run supabase_schema.sql to activate remote Supabase table.'}
                </span>
              </div>
            </div>

            {/* Search and Advanced Filters */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by name, SKU, brand, or category..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Stock Filter */}
                  <select
                    value={productStockFilter}
                    onChange={(e) => setProductStockFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Stock Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock (&le; {lowStockThreshold})</option>
                    <option value="out_of_stock">Out of Stock (0)</option>
                  </select>

                  {/* Active / Inactive Filter */}
                  <select
                    value={productActiveFilter}
                    onChange={(e) => setProductActiveFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>

                  {/* Featured Filter */}
                  <select
                    value={productFeaturedFilter}
                    onChange={(e) => setProductFeaturedFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Featured &amp; Standard</option>
                    <option value="featured">Featured Only</option>
                    <option value="standard">Standard Only</option>
                  </select>

                  {(productSearch ||
                    productCategoryFilter !== 'all' ||
                    productStockFilter !== 'all' ||
                    productActiveFilter !== 'all' ||
                    productFeaturedFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setProductCategoryFilter('all');
                        setProductStockFilter('all');
                        setProductActiveFilter('all');
                        setProductFeaturedFilter('all');
                      }}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                <span>
                  Showing <strong className="text-white">{filteredAdminProducts.length}</strong> of{' '}
                  <strong className="text-white">{products.length}</strong> products
                </span>
                <span className="text-neutral-500">
                  Tip: Stock alerts are triggered at &le; {lowStockThreshold} units
                </span>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Price (PKR)</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredAdminProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt=""
                            className="w-10 h-10 object-cover rounded-lg border border-neutral-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-xs flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.isFeatured && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                                  FEATURED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-amber-500">{p.brand}</div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-neutral-400">{p.sku}</td>
                        <td className="p-3 text-neutral-300">{p.categoryName || p.categoryId}</td>
                        <td className="p-3 text-right font-black text-amber-400">
                          Rs. {p.price.toLocaleString()}
                          {p.salePrice && p.salePrice < p.price && (
                            <div className="text-[10px] text-emerald-400 font-semibold line-through">
                              Rs. {p.salePrice.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-xs ${
                              p.stock <= 0
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : p.stock <= (p.lowStockThreshold || lowStockThreshold)
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {p.stock <= 0 ? 'Out of Stock (0)' : `${p.stock} units`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status !== 'inactive'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {p.status !== 'inactive' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 cursor-pointer transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeleteProduct(p)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAdminProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-400 italic">
                          No products found matching your search or filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Category Architecture</h2>
                <p className="text-xs text-neutral-400 mt-1">Manage departments, subcategories, ordering, and imagery.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative max-w-xs">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => {
                    setEditingCategory({
                      name: '',
                      description: '',
                      iconName: 'Zap',
                      subcategories: [],
                      displayOrder: categories.length + 1,
                      isActive: true,
                    });
                    setIsCategoryModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Category</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdminCategories.map((cat) => (
                <div key={cat.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-700 shrink-0 bg-neutral-950"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 text-amber-400">
                          <FolderTree className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">{cat.name}</h3>
                        <div className="text-[11px] text-neutral-400 font-mono truncate">/{cat.slug}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              cat.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {cat.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className="text-[10px] text-neutral-500">Order: {cat.displayOrder || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => promptDeleteCategory(cat)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2">{cat.description || 'No description provided.'}</p>
                  <div className="pt-2 border-t border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                      Subcategories ({cat.subcategories?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cat.subcategories && cat.subcategories.length > 0 ? (
                        cat.subcategories.map((s) => (
                          <span key={s.id} className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-neutral-600 italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAdminCategories.length === 0 && (
                <div className="col-span-full p-8 text-center bg-neutral-900 rounded-2xl border border-neutral-800 text-neutral-400 italic">
                  No categories found matching "{categorySearch}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVENTORY ENGINE & LEDGER */}
        {activeTab === 'inventory' && (
          <InventoryTab
            products={products}
            inventoryLedger={inventoryLedger}
            adminToken={adminToken}
            adminRole={adminRole}
            onRefresh={() => {
              refreshProducts();
              adminFetch('/api/admin/inventory/ledger')
                .then((r) => safeJsonResponse(r, []))
                .then((ledg) => {
                  if (Array.isArray(ledg)) setInventoryLedger(ledg);
                });
            }}
            showToast={showToast}
          />
        )}

        {/* TAB 4: ORDERS & COD MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Orders &amp; COD Tracking</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Manage doorstep cash collections, courier consignment numbers, and dispatch status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID, name, phone, city..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={orderDateFilter}
                  onChange={(e) => setOrderDateFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 cursor-pointer focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            {/* Order Status Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
              {[
                { label: 'All Orders', value: 'all', count: orders.length },
                {
                  label: 'Pending',
                  value: 'Pending',
                  count: orders.filter((o) => o.status.toLowerCase().includes('pending')).length,
                },
                {
                  label: 'Confirmed',
                  value: 'Confirmed',
                  count: orders.filter((o) => o.status.toLowerCase() === 'confirmed').length,
                },
                {
                  label: 'Processing',
                  value: 'Processing',
                  count: orders.filter((o) => o.status.toLowerCase() === 'processing').length,
                },
                {
                  label: 'Shipped',
                  value: 'Shipped',
                  count: orders.filter((o) => o.status.toLowerCase() === 'shipped').length,
                },
                {
                  label: 'Delivered',
                  value: 'Delivered',
                  count: orders.filter((o) => o.status.toLowerCase() === 'delivered').length,
                },
                {
                  label: 'Cancelled',
                  value: 'Cancelled',
                  count: orders.filter((o) => o.status.toLowerCase() === 'cancelled').length,
                },
                {
                  label: 'Returned',
                  value: 'Returned',
                  count: orders.filter((o) => o.status.toLowerCase() === 'returned').length,
                },
              ].map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setOrderStatusFilter(st.value)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    orderStatusFilter.toLowerCase() === st.value.toLowerCase()
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">{st.count}</span>
                </button>
              ))}
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer Details</th>
                      <th className="p-3">Items</th>
                      <th className="p-3 text-right">Total (COD)</th>
                      <th className="p-3 text-center">Order Status</th>
                      <th className="p-3 text-center">Payment Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {filteredAdminOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono font-bold text-amber-400">{ord.orderNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ord.customer.fullName}</div>
                          <div className="text-neutral-400 text-[11px]">{ord.customer.phone}</div>
                          <div className="text-neutral-500 text-[10px]">{ord.customer.city}</div>
                        </td>
                        <td className="p-3 text-neutral-300">
                          {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}
                        </td>
                        <td className="p-3 text-right font-black text-amber-400">
                          Rs. {ord.grandTotal.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            className="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-xs cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing</option>
                            <option value="Packed">Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Returned">Returned</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={ord.paymentStatus}
                            onChange={(e) =>
                              handleUpdateOrderStatus(ord.id, ord.status, e.target.value as PaymentStatus)
                            }
                            className="bg-neutral-950 text-neutral-200 border border-neutral-700 rounded px-2 py-1 text-xs cursor-pointer"
                          >
                            <option value="COD Pending">COD Pending</option>
                            <option value="COD Collected">COD Collected</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 cursor-pointer"
                            title="View Order Details & Shipping"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintingOrder(ord)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 cursor-pointer"
                            title="Print Receipt (A4, 80mm POS, 58mm POS)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => promptDeleteOrder(ord)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAdminOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-400 italic">
                          No orders found matching the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS MANAGEMENT & SEGMENTATION */}
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customersList}
            adminToken={adminToken}
            adminRole={adminRole}
            onRefresh={() => {
              adminFetch('/api/admin/customers')
                .then((r) => safeJsonResponse(r, []))
                .then((cust) => {
                  if (Array.isArray(cust)) setCustomersList(cust);
                });
            }}
            showToast={showToast}
          />
        )}

        {/* ADVANCED ANALYTICS & PROFIT ENGINE */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            adminToken={adminToken}
            adminRole={adminRole}
          />
        )}

        {/* TAB 5: HERO BANNERS MANAGEMENT */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Homepage Hero Banners</h2>
                <p className="text-xs text-neutral-400 mt-1">Control slider images, titles, CTAs, and order.</p>
              </div>

              <button
                onClick={() => {
                  setEditingBanner({
                    title: 'New Equipment Promotion',
                    subtitle: 'M.A. GROUP OF COMPANIES',
                    description: 'Explore the latest stock arrivals with cash on delivery across Pakistan.',
                    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1600&q=80',
                    ctaText: 'SHOP NOW',
                    ctaLink: '/shop',
                    displayOrder: banners.length + 1,
                    isActive: true,
                  });
                  setIsBannerModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Banner</span>
              </button>
            </div>

            <div className="space-y-4">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4"
                >
                  <img
                    src={b.imageUrl}
                    alt=""
                    className="w-full md:w-48 h-28 object-cover rounded-xl border border-neutral-700 shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-500">{b.subtitle}</span>
                      <span className="text-neutral-500 text-[10px]">&middot; Order: {b.displayOrder}</span>
                    </div>
                    <h3 className="font-extrabold text-white text-sm">{b.title}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-2">{b.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingBanner(b);
                        setIsBannerModalOpen(true);
                      }}
                      className="p-2 rounded bg-neutral-800 text-amber-400 hover:text-white"
                      title="Edit Banner"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => promptDeleteBanner(b)}
                      className="p-2 rounded bg-neutral-800 text-rose-400 hover:bg-rose-900 hover:text-white cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: COUPONS MANAGEMENT */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Coupons &amp; Promotional Codes</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Create discount codes for customer orders at checkout.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCoupon({
                    code: 'DISCOUNT' + Math.floor(10 + Math.random() * 90),
                    discountType: 'fixed',
                    discountValue: 1000,
                    minOrderAmount: 5000,
                    isActive: true,
                  });
                  setIsCouponModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Coupon</span>
              </button>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Coupon Code</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3">Min Order</th>
                      <th className="p-3 text-center">Times Used</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono font-bold text-amber-400 text-sm tracking-wider">
                          {c.code}
                        </td>
                        <td className="p-3 font-bold text-white">
                          {c.discountType === 'percentage'
                            ? `${c.discountValue}% OFF`
                            : `Rs. ${c.discountValue.toLocaleString()} OFF`}
                        </td>
                        <td className="p-3 text-neutral-300">
                          {c.minOrderAmount ? `Rs. ${c.minOrderAmount.toLocaleString()}` : 'No minimum'}
                        </td>
                        <td className="p-3 text-center text-neutral-400 font-mono">
                          {c.timesUsed || 0}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.isActive
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {c.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => promptDeleteCoupon(c)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-neutral-500">
                          No coupons found. Click "Create Coupon" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: B2B INQUIRIES & QUOTATIONS */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">B2B Quotations &amp; Bulk Inquiries</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Commercial proposals requested by Pakistani contractors, solar installers, and builders.
              </p>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Company / Project</th>
                      <th className="p-3">Contact Person</th>
                      <th className="p-3">Phone &amp; Email</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Details / Budget</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {inquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-neutral-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{inq.companyName}</div>
                          <div className="text-[11px] text-amber-500">{inq.categoryInterest}</div>
                        </td>
                        <td className="p-3 font-semibold text-neutral-200">{inq.contactPerson}</td>
                        <td className="p-3">
                          <div className="text-neutral-300 font-mono">{inq.phone}</div>
                          {inq.email && <div className="text-neutral-500 text-[10px]">{inq.email}</div>}
                        </td>
                        <td className="p-3 text-neutral-400">{inq.city}</td>
                        <td className="p-3 max-w-xs">
                          <div className="line-clamp-2 text-neutral-300 text-[11px]">{inq.projectDetails}</div>
                          {inq.estimatedBudget && (
                            <div className="text-[10px] text-emerald-400 mt-0.5">Budget: {inq.estimatedBudget}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => promptDeleteInquiry(inq)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inquiries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-neutral-500">
                          No inquiries currently pending.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUPER ADMIN SECURITY & STAFF CREDENTIALS */}
        {activeTab === 'security' && (
          <div className="space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white">Administrator Credentials &amp; Master Secret</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black">
                    FULL MASTER ACCESS
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Change the Administrator Master Secret and manage staff passwords and accounts.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingStaff({
                    name: '',
                    email: '',
                    password: '',
                    role: 'admin',
                  });
                  setIsStaffModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff User</span>
              </button>
            </div>

            {/* SECTION 1: CHANGE MASTER SECRET PASSWORD */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  1. Change Administrator Master Secret (Super Admin Password)
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400">
                This password authenticates the Super Admin account and provides unconditional control over the entire system.
              </p>

              {masterSecretSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{masterSecretSuccess}</span>
                </div>
              )}
              {masterSecretError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{masterSecretError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateMasterSecret} className="space-y-4 max-w-lg">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">New Master Secret</label>
                  <input
                    type="password"
                    required
                    value={newMasterSecret}
                    onChange={(e) => setNewMasterSecret(e.target.value)}
                    placeholder="Enter new master secret password..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Confirm New Master Secret</label>
                  <input
                    type="password"
                    required
                    value={confirmMasterSecret}
                    onChange={(e) => setConfirmMasterSecret(e.target.value)}
                    placeholder="Confirm new master secret password..."
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  UPDATE MASTER SECRET
                </button>
              </form>
            </div>

            {/* SECTION 2: STAFF USERS & CREDENTIALS */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Users className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    2. Staff Credentials &amp; Passwords
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {(securitySettings?.staffList || []).length} authorized staff accounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Email Login</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Password</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {(securitySettings?.staffList || []).map((st) => (
                      <tr key={st.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-bold text-white">{st.name}</td>
                        <td className="p-3 text-neutral-300 font-mono">{st.email}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 uppercase">
                            {st.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-neutral-400">
                          <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-neutral-200">
                            {st.password}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingStaff(st);
                              setIsStaffModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 cursor-pointer"
                            title="Change Staff Password / Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeleteStaff(st)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Staff Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(securitySettings?.staffList || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-neutral-500">
                          No staff accounts configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AI OPERATIONS ASSISTANT */}
        {activeTab === 'ai-assistant' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <span>AI Operations &amp; Copywriter</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Generate technical product descriptions, SEO meta descriptions, or analyze stock trends.
              </p>
            </div>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase">Insight Task Type</label>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="product_description">Generate Technical Product Description</option>
                  <option value="seo_meta">Generate SEO Title &amp; Meta Description</option>
                  <option value="inventory_insight">Inventory Restock &amp; Pricing Recommendation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300 uppercase">Equipment Name or Prompt</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. 10kW On-Grid Solar Inverter with 3-Phase IP65 WAPDA Net Metering compliance..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleGenerateAi}
                disabled={aiLoading || !aiPrompt}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{aiLoading ? 'Generating with Gemini...' : 'Generate with Gemini'}</span>
              </button>

              {aiResult && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="font-bold text-amber-400 uppercase text-[11px]">Generated Result:</div>
                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SECURITY & AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Security &amp; Audit Logs</h2>
              <p className="text-xs text-neutral-400 mt-1">Live record of administrative logins and store changes.</p>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Action</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-bold text-amber-400">{log.action}</td>
                        <td className="p-3 text-neutral-300">{log.performedBy}</td>
                        <td className="p-3 text-neutral-400 font-sans text-xs">{log.details}</td>
                        <td className="p-3 text-neutral-500">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: STORE & WEBSITE CONTROLS */}
        {activeTab === 'settings' && adminSettings && (
          <div className="space-y-8 max-w-4xl">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Full Website Control &amp; Store Settings</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Control all website text, helpline visibility, showroom locations, shipping rates, and Cash on Delivery rules in real time.
              </p>
            </div>

            {/* Section 1: Store Branding & Top Announcement Bar */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                1. Store Identity &amp; Top Announcement Bar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Store Name</label>
                  <input
                    type="text"
                    value={adminSettings.storeName}
                    onChange={(e) => setAdminSettings({ ...adminSettings, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Tagline / Slogan</label>
                  <input
                    type="text"
                    value={adminSettings.tagline}
                    onChange={(e) => setAdminSettings({ ...adminSettings, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-neutral-300">Top Header Announcement Bar Text</label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={adminSettings.showAnnouncementBar !== false}
                      onChange={(e) => setAdminSettings({ ...adminSettings, showAnnouncementBar: e.target.checked })}
                      className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                    />
                    <span>Show on Website</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={adminSettings.announcementBarText || ''}
                  onChange={(e) => setAdminSettings({ ...adminSettings, announcementBarText: e.target.value })}
                  placeholder="e.g. Modern Solutions. Quality Products. — Official Pakistan Store"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Section 1B: Official Receipt & Invoice Logo (Printed on A4, 80mm & 58mm POS Receipts) */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    <span>Receipt &amp; Invoice Logo Configuration</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Upload your official company logo to print automatically on all Admin A4, 80mm POS, and 58mm thermal receipts.
                  </p>
                </div>
                {isUploadingReceiptLogo && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Logo to Supabase...</span>
                  </div>
                )}
              </div>

              <input
                ref={receiptLogoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                disabled={isUploadingReceiptLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
                    const err = 'Please select a valid image file (JPG, PNG, or WEBP).';
                    setReceiptLogoUploadError(err);
                    showToast(err, 'error');
                    if (receiptLogoInputRef.current) receiptLogoInputRef.current.value = '';
                    return;
                  }
                  if (file.size > 8 * 1024 * 1024) {
                    const err = 'Logo file size must be less than 8MB.';
                    setReceiptLogoUploadError(err);
                    showToast(err, 'error');
                    if (receiptLogoInputRef.current) receiptLogoInputRef.current.value = '';
                    return;
                  }
                  setIsUploadingReceiptLogo(true);
                  setReceiptLogoUploadError(null);
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const base64Data = reader.result as string;
                      const res = await adminFetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          filename: `receipt-logo-${file.name}`,
                          fileData: base64Data,
                          contentType: file.type || 'image/png',
                        }),
                      });
                      const data = await safeJsonResponse(res, { success: false, error: 'Upload failed' });
                      if (!res.ok || !data.success || !data.url) {
                        throw new Error(data.error || 'Failed to upload logo to Supabase Storage');
                      }
                      const updatedSettings = { ...adminSettings, receiptLogoUrl: data.url };
                      setAdminSettings(updatedSettings);
                      // Save immediately to database
                      const saveRes = await adminFetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedSettings),
                      });
                      if (saveRes.ok) {
                        await refreshSettings();
                        showToast('Receipt logo uploaded & saved for printing!', 'success');
                      } else {
                        showToast('Logo uploaded. Click Save Settings to publish.', 'info');
                      }
                    } catch (err: any) {
                      const errMsg = err.message || 'Failed to upload receipt logo';
                      setReceiptLogoUploadError(errMsg);
                      showToast(errMsg, 'error');
                    } finally {
                      setIsUploadingReceiptLogo(false);
                      if (receiptLogoInputRef.current) receiptLogoInputRef.current.value = '';
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="w-32 h-24 rounded-xl bg-white border border-neutral-700 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  {adminSettings.receiptLogoUrl ? (
                    <img
                      src={adminSettings.receiptLogoUrl}
                      alt="Receipt Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-neutral-500 text-[10px] font-semibold">
                      No Logo Uploaded
                      <div className="text-[9px] text-neutral-400">(Text Header Only)</div>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploadingReceiptLogo}
                      onClick={() => receiptLogoInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{adminSettings.receiptLogoUrl ? 'Change Receipt Logo' : 'Upload Receipt Logo from Device'}</span>
                    </button>
                    {adminSettings.receiptLogoUrl && (
                      <button
                        type="button"
                        disabled={isUploadingReceiptLogo}
                        onClick={() => setAdminSettings({ ...adminSettings, receiptLogoUrl: '' })}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-neutral-400 block">
                      Or paste direct Logo Image URL:
                    </label>
                    <input
                      type="text"
                      value={adminSettings.receiptLogoUrl || ''}
                      onChange={(e) => setAdminSettings({ ...adminSettings, receiptLogoUrl: e.target.value })}
                      placeholder="https://... logo URL for printed receipts"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-mono text-[11px]"
                    />
                  </div>

                  {receiptLogoUploadError && (
                    <p className="text-rose-400 text-[11px]">{receiptLogoUploadError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Printed Receipt Footer Thank-You Note</label>
                <input
                  type="text"
                  value={adminSettings.receiptFooterNote || ''}
                  onChange={(e) => setAdminSettings({ ...adminSettings, receiptFooterNote: e.target.value })}
                  placeholder="e.g. THANK YOU FOR CHOOSING M.A. GROUP OF COMPANIES"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Section 2: Helpline & Customer Contact Controls */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                2. Helpline &amp; Customer Support Controls
              </h3>
              <p className="text-[11px] text-neutral-400">
                You can completely hide or display helpline numbers and customer contact channels.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-neutral-200">Phone Helpline</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-amber-400 text-[11px]">
                      <input
                        type="checkbox"
                        checked={Boolean(adminSettings.showHelpline)}
                        onChange={(e) => setAdminSettings({ ...adminSettings, showHelpline: e.target.checked })}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                      />
                      <span>Show on Public Site</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={adminSettings.contactPhone || ''}
                    onChange={(e) => setAdminSettings({ ...adminSettings, contactPhone: e.target.value })}
                    placeholder="e.g. +92 300 1234567 (or leave blank)"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                  />
                  <div className="text-[10px] text-neutral-500">
                    {adminSettings.showHelpline
                      ? 'Currently displayed in header and footer.'
                      : 'Currently hidden from public website.'}
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-neutral-200">WhatsApp Chat</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-amber-400 text-[11px]">
                      <input
                        type="checkbox"
                        checked={Boolean(adminSettings.showWhatsapp)}
                        onChange={(e) => setAdminSettings({ ...adminSettings, showWhatsapp: e.target.checked })}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                      />
                      <span>Show on Public Site</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={adminSettings.whatsappNumber || ''}
                    onChange={(e) => setAdminSettings({ ...adminSettings, whatsappNumber: e.target.value })}
                    placeholder="e.g. +92 300 1234567 (or leave blank)"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white"
                  />
                  <div className="text-[10px] text-neutral-500">
                    {adminSettings.showWhatsapp
                      ? 'WhatsApp link visible in top bar.'
                      : 'WhatsApp link hidden from public website.'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Official Customer Support Email</label>
                <input
                  type="email"
                  value={adminSettings.contactEmail}
                  onChange={(e) => setAdminSettings({ ...adminSettings, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Section 3: Physical Showrooms & Locations Controls */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                    3. Physical Locations &amp; Showrooms
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Toggle showroom addresses on or off across footer and contact pages.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-amber-400 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(adminSettings.showLocations)}
                    onChange={(e) => setAdminSettings({ ...adminSettings, showLocations: e.target.checked })}
                    className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                  />
                  <span>Show Locations on Site</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-neutral-300">Corporate Head Office / Logistics Hub</label>
                  <input
                    type="text"
                    value={adminSettings.headOfficeAddress || ''}
                    onChange={(e) => setAdminSettings({ ...adminSettings, headOfficeAddress: e.target.value })}
                    placeholder="e.g. Plot 42-B, Industrial Estate, Multan Road, Lahore"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Lahore Display Center</label>
                  <input
                    type="text"
                    value={adminSettings.lahoreShowroom || ''}
                    onChange={(e) => setAdminSettings({ ...adminSettings, lahoreShowroom: e.target.value })}
                    placeholder="Showroom address in Lahore (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Karachi Display Center</label>
                  <input
                    type="text"
                    value={adminSettings.karachiShowroom || ''}
                    onChange={(e) => setAdminSettings({ ...adminSettings, karachiShowroom: e.target.value })}
                    placeholder="Showroom address in Karachi (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Cash on Delivery (COD) & Shipping Rates */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                4. Cash on Delivery (COD) &amp; Shipping Rates
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Standard Shipping Fee (PKR)</label>
                  <input
                    type="number"
                    value={adminSettings.standardShippingFee}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, standardShippingFee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Free Delivery Minimum (PKR)</label>
                  <input
                    type="number"
                    value={adminSettings.freeShippingThreshold}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, freeShippingThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Maximum COD Order Limit (PKR)</label>
                  <input
                    type="number"
                    value={adminSettings.codMaxAmount}
                    onChange={(e) => setAdminSettings({ ...adminSettings, codMaxAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Cash on Delivery Instructions for Customers</label>
                <textarea
                  rows={2}
                  value={adminSettings.codInstructions}
                  onChange={(e) => setAdminSettings({ ...adminSettings, codInstructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Section 5: AI Assistant Controls */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                    5. M.A. Smart AI Shopping Assistant
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Grounded in catalog products to help customers with solar, electrical, and hardware specifications.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-amber-400 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(adminSettings.aiAssistantEnabled)}
                    onChange={(e) => setAdminSettings({ ...adminSettings, aiAssistantEnabled: e.target.checked })}
                    className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                  />
                  <span>Enable AI Assistant</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">AI Assistant Greeting Message</label>
                <textarea
                  rows={2}
                  value={adminSettings.aiWelcomeMessage}
                  onChange={(e) => setAdminSettings({ ...adminSettings, aiWelcomeMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Section 6: Footer Corporate Story */}
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                6. Footer Corporate Story &amp; Overview
              </h3>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Footer About Story</label>
                <textarea
                  rows={3}
                  value={adminSettings.footerAboutText || ''}
                  onChange={(e) => setAdminSettings({ ...adminSettings, footerAboutText: e.target.value })}
                  placeholder="Enter corporate story displayed in the footer..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={async () => {
                  try {
                    const res = await adminFetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(adminSettings),
                    });
                    const data = await safeJsonResponse(res, null);
                    if (!res.ok) {
                      showToast(data?.error || 'Failed to save settings', 'error');
                      return;
                    }
                    await refreshSettings();
                    showToast('All website settings and receipt logo saved and published live!', 'success');
                  } catch (err: any) {
                    showToast(err?.message || 'Error saving settings', 'error');
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-sm px-8 py-3.5 rounded-xl cursor-pointer shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                SAVE &amp; PUBLISH ALL SETTINGS
              </button>
              <span className="text-xs text-neutral-400">Updates take effect across the website &amp; receipt printer instantly.</span>
            </div>
          </div>
        )}
      </main>

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {editingProduct.id ? 'Edit Equipment' : 'Add New Equipment'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Product Title</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Category</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={(e) => {
                      const sel = categories.find((c) => c.id === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        categoryId: e.target.value,
                        categoryName: sel?.name || '',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Sale Price (Optional)</label>
                  <input
                    type="number"
                    value={editingProduct.salePrice || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        salePrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              {/* Product Image Upload Section */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-neutral-200 text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Product Image</span>
                      <span className="text-[10px] text-amber-500 font-semibold">(Supabase Storage)</span>
                    </label>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Upload directly from your device gallery. Saved to Supabase storage bucket <code className="text-amber-400 font-mono text-[10px]">product-images</code>.
                    </p>
                  </div>
                  {isUploadingImage && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Uploading to Supabase...</span>
                    </div>
                  )}
                </div>

                {/* Hidden File Input for Device Gallery / File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleImageFileUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                  id="admin-product-file-picker"
                />

                {/* Case 1: Image is Selected/Available -> Show Rich Preview Card */}
                {editingProduct.images?.[0] ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 flex items-center justify-center">
                          <img
                            src={editingProduct.images[0]}
                            alt="Product Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2 text-left w-full">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              editingProduct.images[0].includes('supabase.co')
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            }`}>
                              {editingProduct.images[0].includes('supabase.co')
                                ? '✓ Saved in Supabase Storage'
                                : 'External / Web Image'}
                            </span>
                          </div>

                          <div className="text-[11px] text-neutral-400 font-mono break-all line-clamp-2">
                            {editingProduct.images[0]}
                          </div>

                          {/* Action Buttons: Change Image & Remove Image */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isUploadingImage}
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Change Image</span>
                            </button>
                            <button
                              type="button"
                              disabled={isUploadingImage}
                              onClick={handleRemoveImage}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Image</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowUrlInput(!showUrlInput)}
                              className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer ml-auto"
                            >
                              {showUrlInput ? 'Hide URL' : 'Edit URL directly'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case 2: No Image Selected Yet -> Big Prominent Upload Area */
                  <div
                    onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-800 hover:border-amber-500/50 bg-neutral-900/60 hover:bg-neutral-900/90 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto group-hover:scale-105 transition-transform">
                      {isUploadingImage ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">
                        {isUploadingImage ? 'Uploading Image to Supabase Storage...' : 'Choose Image / Upload Image'}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Click to choose image from device gallery (JPG, JPEG, PNG, WEBP up to 8MB)
                      </p>
                    </div>
                    <div>
                      <span className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs shadow-md">
                        {isUploadingImage ? 'Uploading...' : 'Choose Image from Gallery'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Upload Error Alert */}
                {imageUploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="flex-1">{imageUploadError}</span>
                    <button
                      type="button"
                      onClick={() => setImageUploadError(null)}
                      className="text-neutral-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Optional manual URL fallback */}
                {(showUrlInput || !editingProduct.images?.[0]) && (
                  <div className="pt-2 border-t border-neutral-800/80">
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Or paste an external Image URL (fallback):
                    </label>
                    <input
                      type="text"
                      placeholder="https://... image link"
                      value={editingProduct.images?.[0] || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Warranty</label>
                <input
                  type="text"
                  value={editingProduct.warranty || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, warranty: e.target.value })}
                  placeholder="e.g. 5 Years Inverex Warranty"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Product Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              {/* Availability Status & Featured Status Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300 block">Storefront Availability</label>
                  <select
                    value={editingProduct.status || 'active'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        status: e.target.value as Product['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white cursor-pointer"
                  >
                    <option value="active">Active (Visible on Storefront)</option>
                    <option value="inactive">Inactive (Hidden from Storefront)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
                    <span className="font-bold text-neutral-200">Featured Product</span>
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.isFeatured)}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          isFeatured: e.target.checked,
                        })
                      }
                      className="rounded border-neutral-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  disabled={isSavingProduct || isUploadingImage}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct || isUploadingImage}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProduct && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingProduct ? 'Saving product...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {editingCategory.id ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    placeholder="e.g. Solar Equipment"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Display Order</label>
                  <input
                    type="number"
                    value={editingCategory.displayOrder ?? 0}
                    onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Brief description of products in this category..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              {/* Category Image Upload from Device */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-neutral-200 text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Category Image</span>
                      <span className="text-[10px] text-amber-500 font-semibold">(Supabase Storage)</span>
                    </label>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Upload directly from device gallery or camera. Saved to Supabase storage bucket.
                    </p>
                  </div>
                  {isUploadingCategoryImage && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>

                <input
                  ref={categoryFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleCategoryImageFileUpload}
                  disabled={isUploadingCategoryImage}
                  className="hidden"
                  id="admin-category-file-picker"
                />

                {editingCategory.image ? (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 flex items-center justify-center">
                      <img
                        src={editingCategory.image}
                        alt="Category Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {isUploadingCategoryImage && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-bold text-white text-xs truncate max-w-xs">{editingCategory.name || 'Category'}</div>
                      <div className="text-[10px] text-neutral-400 truncate max-w-xs">{editingCategory.image}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => categoryFileInputRef.current?.click()}
                          disabled={isUploadingCategoryImage}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold cursor-pointer"
                        >
                          Change Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory({ ...editingCategory, image: '' })}
                          disabled={isUploadingCategoryImage}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => categoryFileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-800 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-neutral-900/50 hover:bg-neutral-900"
                  >
                    <Upload className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                    <span className="font-bold text-neutral-200">Choose Image from Device</span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Accepts JPG, PNG, WEBP up to 8MB</p>
                  </div>
                )}

                {categoryImageUploadError && (
                  <p className="text-rose-400 text-[11px]">{categoryImageUploadError}</p>
                )}
              </div>

              {/* Subcategories */}
              <div className="space-y-2 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <label className="font-bold text-neutral-200 text-xs">Subcategories (Optional)</label>
                <div className="flex flex-wrap gap-1.5 min-h-6">
                  {(editingCategory.subcategories || []).map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px]"
                    >
                      <span>{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategory(sub.id)}
                        className="text-neutral-400 hover:text-rose-400 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {(!editingCategory.subcategories || editingCategory.subcategories.length === 0) && (
                    <span className="text-neutral-500 italic text-[11px]">No subcategories added yet.</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                    placeholder="Enter subcategory name..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold cursor-pointer text-xs"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Active / Inactive Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <div className="font-bold text-neutral-200 text-xs">Category Status</div>
                  <div className="text-[11px] text-neutral-400">
                    {editingCategory.isActive !== false ? 'Active & visible in customer store' : 'Inactive & hidden from customer store'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCategory({
                      ...editingCategory,
                      isActive: editingCategory.isActive === false ? true : false,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                    editingCategory.isActive !== false
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {editingCategory.isActive !== false ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  disabled={isSavingCategory || isUploadingCategoryImage}
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory || isUploadingCategoryImage}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingCategory && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingCategory ? 'Saving to Supabase...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Modal */}
      {isBannerModalOpen && editingBanner && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {editingBanner.id ? 'Edit Hero Banner' : 'Add Hero Banner'}
            </h3>
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Banner Title</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="e.g. Modern Equipment for Modern Pakistan"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Subtitle / Tag</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  placeholder="e.g. TIER-1 SOLAR & ELECTRICAL"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Image URL</label>
                <input
                  type="text"
                  required
                  value={editingBanner.imageUrl || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">CTA Button Text</label>
                  <input
                    type="text"
                    value={editingBanner.ctaText || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                    placeholder="SHOP NOW"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Display Order</label>
                  <input
                    type="number"
                    value={editingBanner.displayOrder || 1}
                    onChange={(e) => setEditingBanner({ ...editingBanner, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Description</label>
                <textarea
                  rows={2}
                  value={editingBanner.description || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {isCouponModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {editingCoupon.id ? 'Edit Coupon' : 'Create Coupon Code'}
            </h3>
            <form onSubmit={handleSaveCoupon} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER1000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Discount Type</label>
                  <select
                    value={editingCoupon.discountType || 'fixed'}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="fixed">Fixed PKR (Rs.)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-300">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={editingCoupon.discountValue || 0}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Minimum Order Amount (PKR)</label>
                <input
                  type="number"
                  value={editingCoupon.minOrderAmount || 0}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrderAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff User Add/Edit Modal */}
      {isStaffModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {editingStaff.id ? 'Edit Staff Credentials' : 'Add New Staff Member'}
            </h3>
            <form onSubmit={handleSaveStaff} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  placeholder="e.g. Muhammad Asif"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Email Address (Login)</label>
                <input
                  type="email"
                  required
                  value={editingStaff.email || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  placeholder="asif@magroup.pk"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Password</label>
                <input
                  type="text"
                  required
                  value={editingStaff.password || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                  placeholder="Enter staff password..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Role &amp; Permissions</label>
                <select
                  value={editingStaff.role || 'admin'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                >
                  <option value="admin">Operations Admin</option>
                  <option value="staff">Catalog &amp; Order Staff</option>
                  <option value="superadmin">Super Administrator</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 text-xs shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Confirm Deletion
                </h3>
                <p className="text-neutral-400 mt-1">
                  Are you sure you want to delete this {deleteConfirmation.type}?
                </p>
              </div>
              <button
                disabled={isDeletingItem}
                onClick={() => setDeleteConfirmation(null)}
                className="text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Target Item Summary */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="font-bold text-white text-sm">
                {deleteConfirmation.title}
              </div>
              {deleteConfirmation.subtitle && (
                <div className="text-[11px] text-neutral-400">
                  {deleteConfirmation.subtitle}
                </div>
              )}
            </div>

            {/* Category / Dependency Warning */}
            {deleteConfirmation.warning && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {deleteConfirmation.warning}
                </div>
              </div>
            )}

            {/* Database Error Banner */}
            {deleteModalError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Error:</span> {deleteModalError}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleteConfirmation.blocked ? 'Close' : 'Cancel'}
              </button>

              {!deleteConfirmation.blocked && (
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={executeDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeletingItem ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Item</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Details & Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 text-xs printable-order-modal">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider">
                    Invoice #{selectedOrder.orderNumber}
                  </h3>
                  <div className="text-[11px] text-neutral-400">
                    Placed on: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintingOrder(selectedOrder)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Print Receipt (A4, 80mm POS, 58mm POS)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Order Status</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as OrderStatus;
                    handleUpdateOrderStatus(selectedOrder.id, newStatus);
                    setSelectedOrder({ ...selectedOrder, status: newStatus });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold cursor-pointer text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Payment Status (COD)</label>
                <select
                  value={selectedOrder.paymentStatus}
                  onChange={(e) => {
                    const newPayStatus = e.target.value as PaymentStatus;
                    handleUpdateOrderStatus(selectedOrder.id, selectedOrder.status, newPayStatus);
                    setSelectedOrder({ ...selectedOrder, paymentStatus: newPayStatus });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold cursor-pointer text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="COD Pending">COD Pending (Doorstep Cash)</option>
                  <option value="COD Collected">COD Collected (Paid)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Customer Details & Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="space-y-1.5">
                <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">Customer Contact</div>
                <div className="text-white font-bold text-sm">{selectedOrder.customer.fullName}</div>
                <div className="text-neutral-300 flex items-center gap-2">
                  <span>Phone: {selectedOrder.customer.phone}</span>
                </div>
                {/* WhatsApp Direct Action Button */}
                <div className="pt-1">
                  <a
                    href={`https://wa.me/${(selectedOrder.customer.whatsappNumber || selectedOrder.customer.phone).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold cursor-pointer"
                  >
                    <span>Chat on WhatsApp</span>
                    <span>&rarr;</span>
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">Delivery Destination</div>
                <div className="text-neutral-200">{selectedOrder.customer.addressLine}</div>
                <div className="text-neutral-400">
                  {selectedOrder.customer.city}, {selectedOrder.customer.province}
                </div>
                <div className="text-[11px] text-amber-500/90 font-medium">
                  Payment Method: {selectedOrder.paymentMethod || 'Cash on Delivery (COD)'}
                </div>
                {selectedOrder.customerNotes && (
                  <div className="text-[11px] text-neutral-400 italic pt-1">
                    Note: "{selectedOrder.customerNotes}"
                  </div>
                )}
              </div>
            </div>

            {/* Items Ordered Table */}
            <div className="space-y-2">
              <div className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">Items Ordered</div>
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {selectedOrder.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/30">
                        <td className="p-2.5 font-medium text-white">{it.productName}</td>
                        <td className="p-2.5 text-center font-bold text-neutral-300">{it.quantity}</td>
                        <td className="p-2.5 text-right text-neutral-400">Rs. {it.price.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-white">Rs. {it.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price Calculation Summary */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>Rs. {selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                    <span>- Rs. {selectedOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Delivery Charges</span>
                  <span>{selectedOrder.shippingFee === 0 ? 'FREE' : `Rs. ${selectedOrder.shippingFee.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-800 text-sm font-black text-amber-400">
                  <span>Grand Total (Cash on Delivery)</span>
                  <span>Rs. {selectedOrder.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => promptDeleteOrder(selectedOrder)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintingOrder(selectedOrder)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Print Thermal / A4 Receipt"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authoritative Print Receipt Modal Engine */}
      {printingOrder && (
        <PrintReceiptModal
          order={printingOrder}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};
