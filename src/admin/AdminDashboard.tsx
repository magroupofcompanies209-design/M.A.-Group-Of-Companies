import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
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
} from 'lucide-react';

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
    | 'orders'
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
  const [adminSettings, setAdminSettings] = useState<StoreSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<AdminSecuritySettings | null>(null);

  // Product Edit/Add Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Category Edit/Add Modal
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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

  // Search in tables
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

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
      .then((r) => r.json())
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
      const [ordRes, banRes, coupRes, inqRes, logRes, anaRes, setRes] = await Promise.all([
        adminFetch('/api/orders').then((r) => r.json()),
        adminFetch('/api/banners').then((r) => r.json()),
        adminFetch('/api/coupons').then((r) => r.json()),
        adminFetch('/api/inquiries').then((r) => r.json()),
        adminFetch('/api/admin/audit-logs').then((r) => r.json()),
        adminFetch('/api/admin/analytics').then((r) => r.json()),
        adminFetch('/api/settings').then((r) => r.json()),
      ]);

      if (Array.isArray(ordRes)) setOrders(ordRes);
      if (Array.isArray(banRes)) setBanners(banRes);
      if (Array.isArray(coupRes)) setCoupons(coupRes);
      if (Array.isArray(inqRes)) setInquiries(inqRes);
      if (Array.isArray(logRes)) setAuditLogs(logRes);
      if (anaRes && !anaRes.error) setAnalytics(anaRes);
      if (setRes && !setRes.error) setAdminSettings(setRes);

      // Load security if superadmin or admin
      adminFetch('/api/admin/security')
        .then((r) => r.json())
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

      const data = await res.json();
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
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.sku || !editingProduct.price) {
      showToast('Please provide name, SKU, and price.', 'error');
      return;
    }

    try {
      const isNew = !editingProduct.id;
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/products' : `/api/products/${editingProduct.id}`;

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingProduct,
          images: Array.isArray(editingProduct.images) ? editingProduct.images : [editingProduct.images || ''],
          features: Array.isArray(editingProduct.features) ? editingProduct.features : ['High performance', 'Official Warranty'],
          specifications: editingProduct.specifications || [{ key: 'Warranty', value: 'Manufacturer Warranty' }],
          status: editingProduct.status || 'active',
          rating: editingProduct.rating || 5.0,
          reviewCount: editingProduct.reviewCount || 1,
        }),
      });

      if (!res.ok) throw new Error('Failed to save product');

      await refreshProducts();
      await loadAdminData();
      setIsProductModalOpen(false);
      setEditingProduct(null);
      showToast(`Product ${isNew ? 'created' : 'updated'} successfully.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await adminFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      await refreshProducts();
      await loadAdminData();
      showToast('Product deleted.', 'info');
    } catch {
      showToast('Failed to delete product', 'error');
    }
  };

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return;

    try {
      const isNew = !editingCategory.id;
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/api/categories' : `/api/categories/${editingCategory.id}`;

      const res = await adminFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });

      if (!res.ok) throw new Error('Failed to save category');

      await refreshCategories();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      showToast('Category saved successfully.', 'success');
    } catch {
      showToast('Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await adminFetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      await refreshCategories();
      showToast('Category deleted.', 'info');
    } catch {
      showToast('Failed to delete category', 'error');
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

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this hero banner?')) return;
    try {
      const res = await adminFetch(`/api/banners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete banner');
      await refreshBanners();
      await loadAdminData();
      showToast('Banner deleted.', 'info');
    } catch {
      showToast('Failed to delete banner', 'error');
    }
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

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      const res = await adminFetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete coupon');
      await loadAdminData();
      showToast('Coupon deleted.', 'info');
    } catch {
      showToast('Failed to delete coupon', 'error');
    }
  };

  // Order Deletion
  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      const res = await adminFetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete order');
      await loadAdminData();
      if (selectedOrder && selectedOrder.id === id) setSelectedOrder(null);
      showToast('Order deleted.', 'info');
    } catch {
      showToast('Failed to delete order', 'error');
    }
  };

  // Inquiry Deletion
  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('Delete this quotation inquiry?')) return;
    try {
      const res = await adminFetch(`/api/inquiries/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete inquiry');
      await loadAdminData();
      showToast('Inquiry deleted.', 'info');
    } catch {
      showToast('Failed to delete inquiry', 'error');
    }
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
      const data = await res.json();
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save staff');

      setIsStaffModalOpen(false);
      setEditingStaff(null);
      showToast(`Staff member ${isNew ? 'added' : 'updated'}.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Error saving staff member', 'error');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete these staff credentials?')) return;
    try {
      const res = await adminFetch(`/api/admin/security/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete staff');
      showToast('Staff credentials removed.', 'info');
      loadAdminData();
    } catch {
      showToast('Failed to delete staff member', 'error');
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
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paymentStatus, trackingNumber, courierName }),
      });
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      showToast(`Order status updated to "${status}".`, 'success');
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  // AI Assistant in Admin
  const handleGenerateAi = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await fetch('/api/ai/admin-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, type: aiType }),
      });
      const data = await res.json();
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
  const filteredAdminProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtered Orders for Admin Table
  const filteredAdminOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.fullName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer.phone.includes(orderSearch)
  );

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
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Operations &amp; Sales Summary</h2>
              <p className="text-xs text-neutral-400 mt-1">Live metrics across Pakistan deliveries.</p>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Sales (PKR)</div>
                <div className="text-2xl font-black text-amber-400">
                  Rs. {(analytics?.totalSales || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400">Cash on Delivery Orders</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Orders</div>
                <div className="text-2xl font-black text-white">{analytics?.totalOrders || orders.length}</div>
                <div className="text-[11px] text-neutral-400">{analytics?.pendingOrders || 0} Pending Verification</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Catalog Products</div>
                <div className="text-2xl font-black text-white">{products.length}</div>
                <div className="text-[11px] text-neutral-400">{categories.length} Categories</div>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Low Stock Warnings</div>
                <div className="text-2xl font-black text-rose-400">{analytics?.lowStockCount || 0}</div>
                <div className="text-[11px] text-neutral-400">Need restocking</div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Orders (COD)</h3>
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

            {/* Search filter */}
            <div className="relative max-w-md">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, SKU, or category..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-xs">{p.name}</div>
                            <div className="text-[11px] text-amber-500">{p.brand}</div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-neutral-400">{p.sku}</td>
                        <td className="p-3 text-neutral-300">{p.categoryName}</td>
                        <td className="p-3 text-right font-bold text-white">
                          Rs. {(p.salePrice || p.price).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              p.stock <= p.lowStockThreshold
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {p.stock} in stock
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* TAB 3: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Category Architecture</h2>
                <p className="text-xs text-neutral-400 mt-1">Unlimited nested categories and subcategories.</p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory({
                    name: '',
                    description: '',
                    iconName: 'Zap',
                    subcategories: [],
                    isActive: true,
                  });
                  setIsCategoryModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{cat.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1 text-amber-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2">{cat.description}</p>
                  <div className="pt-2 border-t border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Subcategories:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cat.subcategories?.map((s) => (
                        <span key={s.id} className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Filter by Order ID or phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
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
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-400 cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
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
                      onClick={() => handleDeleteBanner(b.id)}
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
                            onClick={() => handleDeleteCoupon(c.id)}
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
                            onClick={() => handleDeleteInquiry(inq.id)}
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
                            onClick={() => handleDeleteStaff(st.id)}
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
                  await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adminSettings),
                  });
                  await refreshSettings();
                  showToast('All website settings saved and published live!', 'success');
                }}
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-sm px-8 py-3.5 rounded-xl cursor-pointer shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                SAVE &amp; PUBLISH ALL SETTINGS
              </button>
              <span className="text-xs text-neutral-400">Updates take effect across the website instantly.</span>
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

              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Image URL</label>
                <input
                  type="text"
                  required
                  value={editingProduct.images?.[0] || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
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

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {editingCategory.id ? 'Edit Category' : 'Create Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Category Name</label>
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
                <label className="font-bold text-neutral-300">Description</label>
                <textarea
                  rows={3}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Brief description of products in this category..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-neutral-300">Image URL</label>
                <input
                  type="text"
                  value={editingCategory.image || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold cursor-pointer"
                >
                  Save Category
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white uppercase font-mono">
                Order {selectedOrder.orderNumber}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-amber-400 font-bold uppercase text-[11px]">Customer &amp; Address:</div>
              <div className="text-white font-bold">{selectedOrder.customer.fullName}</div>
              <div className="text-neutral-400">{selectedOrder.customer.phone}</div>
              <div className="text-neutral-300">{selectedOrder.customer.addressLine}</div>
              <div className="text-neutral-400">
                {selectedOrder.customer.city}, {selectedOrder.customer.province}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="text-amber-400 font-bold uppercase text-[11px]">Items Ordered:</div>
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-neutral-800">
                  <span>{it.productName} &times; {it.quantity}</span>
                  <span className="font-bold text-white">Rs. {it.total.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-black text-amber-400">
                <span>Grand Total (COD)</span>
                <span>Rs. {selectedOrder.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
