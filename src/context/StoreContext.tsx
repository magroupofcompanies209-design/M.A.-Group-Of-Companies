import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { safeJsonResponse } from '../utils/api';
import {
  supabase,
  isFrontendSupabaseConfigured,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchPartnersFromSupabase,
  fetchSettingsFromSupabase,
  upsertCustomerAccountInSupabase,
  fetchCustomerAccountsFromSupabase,
  fetchCompanyPagesFromSupabase,
  fetchSmartOffersFromSupabase,
  fetchCouponsFromSupabase,
  fetchSolutionPackagesFromSupabase,
} from '../lib/supabaseClient';
import {
  Product,
  Category,
  Brand,
  OrderItem,
  StoreSettings,
  HeroBanner,
  CustomerAccount,
  CompanyPage,
  SmartOffer,
  Coupon,
  SolutionPackage,
} from '../types';

interface CartItem extends OrderItem {
  product: Product;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface StoreContextType {
  products: Product[]; // All products (for Admin)
  visibleProducts: Product[]; // Filtered active products in active categories/subcategories (for Storefront)
  categories: Category[]; // All categories (for Admin)
  visibleCategories: Category[]; // Filtered active categories & active subcategories (for Storefront)
  brands: Brand[]; // All manufacturing partners/brands (for Admin)
  visiblePartners: Brand[]; // Filtered visible manufacturing partners (for Storefront)
  companyPages: CompanyPage[]; // All company profile pages (for Admin)
  visibleCompanyPages: CompanyPage[]; // Filtered visible company pages (for Storefront)
  smartOffers: SmartOffer[]; // All smart offers (for Admin)
  activeSmartOffers: SmartOffer[]; // Active & valid smart offers (for Storefront)
  coupons: Coupon[]; // All coupons
  solutionPackages: SolutionPackage[]; // All solution packages (for Admin)
  visibleSolutions: SolutionPackage[]; // Visible solution packages (for Storefront)
  banners: HeroBanner[];
  settings: StoreSettings | null;
  loading: boolean;
  cart: CartItem[];
  wishlist: string[]; // product IDs
  customerAccount: CustomerAccount | null;
  setCustomerAccount: (account: CustomerAccount | null) => void;
  syncCustomerProfile: (updates: Partial<CustomerAccount>) => Promise<CustomerAccount | null>;
  logoutCustomer: () => Promise<void>;
  appliedCoupon: { code: string; discount: number; description: string } | null;
  activeOfferSavings: { offerName: string; discount: number; freeDelivery: boolean } | null;
  toasts: ToastMessage[];
  currentRoute: string;
  routeParams: Record<string, string>;
  isCartDrawerOpen: boolean;
  isAiChatOpen: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setIsCartDrawerOpen: (open: boolean) => void;
  setIsAiChatOpen: (open: boolean) => void;
  navigate: (route: string, params?: Record<string, string>) => void;
  addToCart: (product: Product, quantity?: number, variant?: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshPartners: () => Promise<void>;
  refreshCompanyPages: () => Promise<void>;
  refreshSmartOffers: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshSolutions: () => Promise<void>;
  refreshBanners: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  cartSubtotal: number;
  cartShippingFee: number;
  cartGrandTotal: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [companyPages, setCompanyPages] = useState<CompanyPage[]>([]);
  const [smartOffers, setSmartOffers] = useState<SmartOffer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [solutionPackages, setSolutionPackages] = useState<SolutionPackage[]>([]);
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Customer Account state with localStorage & Supabase Auth sync
  const [customerAccount, setCustomerAccountState] = useState<CustomerAccount | null>(() => {
    try {
      const saved = localStorage.getItem('magroup_customer_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setCustomerAccount = (acc: CustomerAccount | null) => {
    setCustomerAccountState(acc);
    try {
      if (acc) {
        localStorage.setItem('magroup_customer_account', JSON.stringify(acc));
      } else {
        localStorage.removeItem('magroup_customer_account');
      }
    } catch {
      // ignore storage errors
    }
  };

  // Cart & Wishlist with localStorage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('magroup_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('magroup_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Routing state based on window.location.hash or pathname
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const rawHash = window.location.hash.replace(/^#\/?/, '');
      const [hashPath, queryString] = rawHash.split('?');

      // Parse optional query params inside hash
      const parsedQuery: Record<string, string> = {};
      if (queryString) {
        const sp = new URLSearchParams(queryString);
        sp.forEach((val, key) => {
          parsedQuery[key] = val;
        });
      }

      // Check if accessing admin or secure-admin
      if (
        hashPath.startsWith('secure-admin') ||
        hashPath.startsWith('admin') ||
        (!rawHash && (path.includes('secure-admin') || path.includes('admin')))
      ) {
        setCurrentRoute('admin');
        return;
      }

      if (!hashPath) {
        setCurrentRoute('home');
        setRouteParams(parsedQuery);
        return;
      }

      const parts = hashPath.split('/');
      const main = parts[0];

      if (main === 'product' && parts[1]) {
        setCurrentRoute('product');
        setRouteParams({ ...parsedQuery, id: parts[1] });
      } else if (main === 'company' && parts[1]) {
        setCurrentRoute('company');
        setRouteParams({ ...parsedQuery, slug: parts[1] });
      } else if (main === 'solution' && parts[1]) {
        setCurrentRoute('solution');
        setRouteParams({ ...parsedQuery, slug: parts[1] });
      } else if (main === 'category' && parts[1]) {
        setCurrentRoute('category');
        setRouteParams({
          ...parsedQuery,
          slug: parts[1],
          ...(parts[2] ? { subcategory: parts[2] } : {}),
        });
      } else if (main === 'order-success' && parts[1]) {
        setCurrentRoute('order-success');
        setRouteParams({ ...parsedQuery, orderNumber: parts[1] });
      } else if (main === 'track-order') {
        setCurrentRoute('track-order');
        setRouteParams({
          ...parsedQuery,
          ...(parts[1] ? { orderNumber: parts[1] } : {}),
        });
      } else {
        setCurrentRoute(main || 'home');
        setRouteParams({
          ...parsedQuery,
          ...(parts[1] ? { param: parts[1] } : {}),
        });
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigate = (route: string, params?: Record<string, string>) => {
    const cleanRoute = route.replace(/^\/+/, '') || 'home';
    let hash = `#/${cleanRoute}`;
    if (cleanRoute === 'product' && params?.id) {
      hash = `#/product/${params.id}`;
    } else if (cleanRoute === 'company' && params?.slug) {
      hash = `#/company/${params.slug}`;
    } else if (cleanRoute === 'solution' && params?.slug) {
      hash = `#/solution/${params.slug}`;
    } else if (cleanRoute === 'category' && params?.slug) {
      hash = params.subcategory
        ? `#/category/${params.slug}/${params.subcategory}`
        : `#/category/${params.slug}`;
    } else if (cleanRoute === 'order-success' && params?.orderNumber) {
      hash = `#/order-success/${params.orderNumber}`;
    } else if (cleanRoute === 'track-order' && params?.orderNumber) {
      hash = `#/track-order/${params.orderNumber}`;
    } else if (cleanRoute === 'home') {
      hash = '#/';
    }

    if (cleanRoute === 'admin' || cleanRoute === 'secure-admin') {
      try {
        window.history.pushState({}, '', '/admin');
      } catch {
        // Ignore if pushState is restricted
      }
    } else if (window.location.pathname.includes('admin')) {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        // Ignore if pushState is restricted
      }
    }

    window.location.hash = hash;
    setCurrentRoute(cleanRoute === 'secure-admin' ? 'admin' : cleanRoute);
    setRouteParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync Supabase Auth session if available
  useEffect(() => {
    if (!isFrontendSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user;
      if (user && user.email) {
        const meta = user.user_metadata || {};
        let existingAcc: CustomerAccount | undefined;
        try {
          const allAccs = await fetchCustomerAccountsFromSupabase();
          existingAcc = allAccs.find(
            (a) => a.id === user.id || a.email.toLowerCase() === user.email!.toLowerCase()
          );
        } catch {
          // ignore
        }

        const profile: CustomerAccount = {
          id: user.id,
          fullName: existingAcc?.fullName || meta.full_name || meta.fullName || user.email.split('@')[0],
          email: user.email,
          phone: existingAcc?.phone || meta.phone || '',
          savedAddresses: existingAcc?.savedAddresses || meta.savedAddresses || [],
          wishlist: existingAcc?.wishlist || wishlist,
          accountStatus: 'Active',
          createdAt: existingAcc?.createdAt || user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCustomerAccount(profile);
        fetch('/api/customers/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        }).catch(() => {});
      }
    });
  }, []);

  const syncCustomerProfile = async (
    updates: Partial<CustomerAccount>
  ): Promise<CustomerAccount | null> => {
    if (!customerAccount) return null;
    const updated: CustomerAccount = {
      ...customerAccount,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setCustomerAccount(updated);

    try {
      if (isFrontendSupabaseConfigured && supabase) {
        await supabase.auth
          .updateUser({
            data: {
              full_name: updated.fullName,
              phone: updated.phone,
              savedAddresses: updated.savedAddresses,
            },
          })
          .catch(() => {});
        await upsertCustomerAccountInSupabase(updated);
      }
      await fetch('/api/customers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Failed syncing customer profile:', e);
    }
    return updated;
  };

  const logoutCustomer = async () => {
    try {
      if (isFrontendSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignore
    }
    setCustomerAccount(null);
    showToast('Signed out of your account.', 'info');
  };

  // Persist cart & wishlist
  useEffect(() => {
    try {
      localStorage.setItem('magroup_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed saving cart to localStorage', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('magroup_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Failed saving wishlist to localStorage', e);
    }
  }, [wishlist]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        prodsRes,
        catsRes,
        brandsRes,
        companyRes,
        offersRes,
        couponsRes,
        solutionsRes,
        bannersRes,
        settingsRes,
      ] = await Promise.all([
        fetchProductsFromSupabase().catch(() =>
          fetch(`/api/products?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchCategoriesFromSupabase().catch(() =>
          fetch(`/api/categories?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchPartnersFromSupabase().then(async (supaPartners) => {
          if (Array.isArray(supaPartners) && supaPartners.length > 0) return supaPartners;
          const r = await fetch(`/api/partners?_t=${Date.now()}`, { cache: 'no-store' });
          return safeJsonResponse(r, []);
        }).catch(() =>
          fetch(`/api/partners?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchCompanyPagesFromSupabase().then(async (supaPages) => {
          if (Array.isArray(supaPages) && supaPages.length > 0) return supaPages;
          const r = await fetch(`/api/company-pages?_t=${Date.now()}`, { cache: 'no-store' });
          return safeJsonResponse(r, []);
        }).catch(() =>
          fetch(`/api/company-pages?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchSmartOffersFromSupabase().then(async (supaOffers) => {
          if (Array.isArray(supaOffers) && supaOffers.length > 0) return supaOffers;
          const r = await fetch(`/api/smart-offers?_t=${Date.now()}`, { cache: 'no-store' });
          return safeJsonResponse(r, []);
        }).catch(() =>
          fetch(`/api/smart-offers?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchCouponsFromSupabase().then(async (supaCoupons) => {
          if (Array.isArray(supaCoupons) && supaCoupons.length > 0) return supaCoupons;
          const r = await fetch(`/api/coupons?_t=${Date.now()}`, { cache: 'no-store' });
          return safeJsonResponse(r, []);
        }).catch(() =>
          fetch(`/api/coupons?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetchSolutionPackagesFromSupabase().then(async (supaSolutions) => {
          if (Array.isArray(supaSolutions) && supaSolutions.length > 0) return supaSolutions;
          const r = await fetch(`/api/solutions?_t=${Date.now()}`, { cache: 'no-store' });
          return safeJsonResponse(r, []);
        }).catch(() =>
          fetch(`/api/solutions?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, []))
        ),
        fetch(`/api/banners?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, [])),
        fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' })
          .then((r) => safeJsonResponse(r, null))
          .then(async (apiSettings) => {
            const supaSettings = await fetchSettingsFromSupabase().catch(() => null);
            if (supaSettings && typeof supaSettings === 'object') {
              return { ...(apiSettings || {}), ...supaSettings };
            }
            return apiSettings;
          }),
      ]);

      if (Array.isArray(prodsRes)) setProducts(prodsRes);
      if (Array.isArray(catsRes)) setCategories(catsRes);
      if (Array.isArray(brandsRes)) setBrands(brandsRes);
      if (Array.isArray(companyRes)) setCompanyPages(companyRes);
      if (Array.isArray(offersRes)) setSmartOffers(offersRes);
      if (Array.isArray(couponsRes)) setCoupons(couponsRes);
      if (Array.isArray(solutionsRes)) setSolutionPackages(solutionsRes);
      if (Array.isArray(bannersRes)) setBanners(bannersRes);
      if (settingsRes && !settingsRes.error) setSettings(settingsRes);
    } catch (err) {
      console.error('Failed fetching store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshProducts = async () => {
    try {
      const data = await fetchProductsFromSupabase();
      if (Array.isArray(data)) setProducts(data);
    } catch (e) {
      try {
        const res = await fetch(`/api/products?_t=${Date.now()}`, { cache: 'no-store' });
        const data = await safeJsonResponse(res, []);
        if (Array.isArray(data)) setProducts(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const refreshCategories = async () => {
    try {
      const data = await fetchCategoriesFromSupabase();
      if (Array.isArray(data)) setCategories(data);
    } catch (e) {
      try {
        const res = await fetch(`/api/categories?_t=${Date.now()}`, { cache: 'no-store' });
        const data = await safeJsonResponse(res, []);
        if (Array.isArray(data)) setCategories(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const refreshPartners = async () => {
    try {
      const data = await fetchPartnersFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setBrands(data);
        return;
      }
      const res = await fetch(`/api/partners?_t=${Date.now()}`, { cache: 'no-store' });
      const apiData = await safeJsonResponse(res, []);
      if (Array.isArray(apiData)) setBrands(apiData);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshCompanyPages = async () => {
    try {
      const data = await fetchCompanyPagesFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setCompanyPages(data);
        return;
      }
      const res = await fetch(`/api/company-pages?_t=${Date.now()}`, { cache: 'no-store' });
      const apiData = await safeJsonResponse(res, []);
      if (Array.isArray(apiData)) setCompanyPages(apiData);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSmartOffers = async () => {
    try {
      const data = await fetchSmartOffersFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setSmartOffers(data);
        return;
      }
      const res = await fetch(`/api/smart-offers?_t=${Date.now()}`, { cache: 'no-store' });
      const apiData = await safeJsonResponse(res, []);
      if (Array.isArray(apiData)) setSmartOffers(apiData);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshCoupons = async () => {
    try {
      const data = await fetchCouponsFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setCoupons(data);
        return;
      }
      const res = await fetch(`/api/coupons?_t=${Date.now()}`, { cache: 'no-store' });
      const apiData = await safeJsonResponse(res, []);
      if (Array.isArray(apiData)) setCoupons(apiData);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSolutions = async () => {
    try {
      const data = await fetchSolutionPackagesFromSupabase();
      if (Array.isArray(data) && data.length > 0) {
        setSolutionPackages(data);
        return;
      }
      const res = await fetch(`/api/solutions?_t=${Date.now()}`, { cache: 'no-store' });
      const apiData = await safeJsonResponse(res, []);
      if (Array.isArray(apiData)) setSolutionPackages(apiData);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshBanners = async () => {
    try {
      const res = await fetch('/api/banners');
      const data = await safeJsonResponse(res, []);
      if (Array.isArray(data)) setBanners(data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSettings = async () => {
    try {
      const [res, supaSet] = await Promise.all([
        fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' }).then((r) => safeJsonResponse(r, {})),
        fetchSettingsFromSupabase().catch(() => null),
      ]);
      const merged = supaSet ? { ...(res || {}), ...supaSet } : res;
      if (merged && !merged.error) setSettings(merged);
    } catch (e) {
      console.error(e);
    }
  };

  // Compute visiblePartners, visibleCompanyPages, activeSmartOffers, visibleSolutions, visibleCategories & visibleProducts
  const visiblePartners = useMemo(() => {
    return brands
      .filter((b) => b.isVisible !== false)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [brands]);

  const visibleCompanyPages = useMemo(() => {
    return companyPages
      .filter((p) => p.isVisible !== false)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [companyPages]);

  const activeSmartOffers = useMemo(() => {
    const now = Date.now();
    return smartOffers
      .filter((o) => {
        if (!o.isActive) return false;
        if (o.startDate && new Date(o.startDate).getTime() > now) return false;
        if (o.endDate && new Date(o.endDate).getTime() < now) return false;
        return true;
      })
      .sort((a, b) => (a.priorityOrder ?? 99) - (b.priorityOrder ?? 99));
  }, [smartOffers]);

  const visibleSolutions = useMemo(() => {
    return solutionPackages
      .filter((s) => s.isVisible !== false)
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [solutionPackages]);

  const visibleCategories = useMemo(() => {
    return categories
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        ...c,
        subcategories: (c.subcategories || [])
          .filter((s) => s.isActive !== false)
          .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1)),
      }))
      .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
  }, [categories]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Check product visibility
      if (p.isActive === false || p.status === 'inactive' || p.status === 'archived' || p.isArchived) {
        return false;
      }
      // 2. Check parent category visibility
      const parentCat = categories.find(
        (c) =>
          c.id === p.categoryId ||
          c.slug.toLowerCase() === (p.categoryId || '').toLowerCase() ||
          (p.categoryName && c.name.toLowerCase() === p.categoryName.toLowerCase())
      );
      if (parentCat && parentCat.isActive === false) {
        return false;
      }
      // 3. Check subcategory visibility if assigned to a subcategory
      if (parentCat && (p.subcategoryId || p.subcategoryName)) {
        const sub = (parentCat.subcategories || []).find(
          (s) =>
            (p.subcategoryId && (s.id === p.subcategoryId || s.slug === p.subcategoryId)) ||
            (p.subcategoryName && s.name.toLowerCase() === p.subcategoryName.toLowerCase())
        );
        if (sub && sub.isActive === false) {
          return false;
        }
      }
      return true;
    });
  }, [products, categories]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, variant?: any) => {
    if (settings?.maintenanceMode === true || settings?.storefrontEnabled === false) {
      showToast('The store is currently undergoing maintenance.', 'error');
      return;
    }
    if (product.isActive === false || product.status === 'inactive' || product.status === 'archived') {
      showToast('This product is currently unavailable.', 'error');
      return;
    }
    const effectivePrice = product.salePrice || product.price;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        next[existingIdx].total = next[existingIdx].quantity * next[existingIdx].price;
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productImage: product.images[0] || '',
          sku: product.sku,
          price: effectivePrice,
          quantity,
          total: effectivePrice * quantity,
          variantId: variant?.id,
          variantName: variant?.name,
          product,
        },
      ];
    });

    showToast(`Added "${product.name}" to cart.`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    showToast('Item removed from cart.', 'info');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to your wishlist', 'success');
        return [...prev, productId];
      }
    });
  };

  // Coupon handling
  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);

  const applyCoupon = async (code: string) => {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartSubtotal }),
      });
      const data = await safeJsonResponse(res, { valid: false, message: 'Invalid server response' });
      if (data.valid) {
        setAppliedCoupon({
          code: data.code,
          discount: data.discount,
          description: data.description,
        });
        showToast(`Coupon "${data.code}" applied! You saved Rs. ${data.discount.toLocaleString()}`, 'success');
        return { success: true, message: 'Coupon applied successfully' };
      } else {
        showToast(data.message || 'Invalid coupon code', 'error');
        return { success: false, message: data.message || 'Invalid coupon' };
      }
    } catch {
      showToast('Error validating coupon', 'error');
      return { success: false, message: 'Server error' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  // Automatic Smart Offer savings calculation for cart
  const activeOfferSavings = useMemo(() => {
    if (cart.length === 0 || activeSmartOffers.length === 0) return null;

    let bestOffer: { offerName: string; discount: number; freeDelivery: boolean } | null = null;
    for (const offer of activeSmartOffers) {
      if (offer.minOrderValue && cartSubtotal < offer.minOrderValue) continue;

      let eligibleSubtotal = cartSubtotal;
      if (offer.applicableProducts && offer.applicableProducts.length > 0) {
        eligibleSubtotal = cart
          .filter((item) => offer.applicableProducts!.includes(item.productId))
          .reduce((sum, item) => sum + item.total, 0);
      } else if (offer.applicableCategories && offer.applicableCategories.length > 0) {
        eligibleSubtotal = cart
          .filter(
            (item) =>
              offer.applicableCategories!.includes(item.product.categoryId) ||
              (item.product.categoryName &&
                offer.applicableCategories!.some(
                  (c) => c.toLowerCase() === item.product.categoryName!.toLowerCase()
                ))
          )
          .reduce((sum, item) => sum + item.total, 0);
      }

      if (eligibleSubtotal <= 0) continue;

      let calcDiscount = 0;
      let isFreeDelivery = offer.offerType === 'Free Delivery';

      if (offer.discountPercentage && offer.discountPercentage > 0) {
        calcDiscount = Math.round((eligibleSubtotal * offer.discountPercentage) / 100);
      } else if (offer.fixedDiscountAmount && offer.fixedDiscountAmount > 0) {
        calcDiscount = offer.fixedDiscountAmount;
      }

      if (offer.maxDiscount && calcDiscount > offer.maxDiscount) {
        calcDiscount = offer.maxDiscount;
      }

      if (calcDiscount > eligibleSubtotal) {
        calcDiscount = eligibleSubtotal;
      }

      if (
        (calcDiscount > 0 || isFreeDelivery) &&
        (!bestOffer || calcDiscount > bestOffer.discount || (isFreeDelivery && !bestOffer.freeDelivery))
      ) {
        bestOffer = {
          offerName: offer.name,
          discount: calcDiscount,
          freeDelivery: isFreeDelivery,
        };
      }
    }
    return bestOffer;
  }, [cart, cartSubtotal, activeSmartOffers]);

  const freeThreshold = settings?.freeShippingThreshold || 5000;
  const standardFee = settings?.standardShippingFee || 450;
  const cartShippingFee =
    cartSubtotal === 0 ||
    cartSubtotal >= freeThreshold ||
    activeOfferSavings?.freeDelivery === true
      ? 0
      : standardFee;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const offerDiscount = activeOfferSavings ? activeOfferSavings.discount : 0;
  const totalDiscount = couponDiscount + offerDiscount;
  const cartGrandTotal = Math.max(0, cartSubtotal - totalDiscount + cartShippingFee);

  return (
    <StoreContext.Provider
      value={{
        products,
        visibleProducts,
        categories,
        visibleCategories,
        brands,
        visiblePartners,
        companyPages,
        visibleCompanyPages,
        smartOffers,
        activeSmartOffers,
        coupons,
        solutionPackages,
        visibleSolutions,
        banners,
        settings,
        loading,
        cart,
        wishlist,
        customerAccount,
        setCustomerAccount,
        syncCustomerProfile,
        logoutCustomer,
        appliedCoupon,
        activeOfferSavings,
        toasts,
        currentRoute,
        routeParams,
        isCartDrawerOpen,
        isAiChatOpen,
        searchQuery,
        setSearchQuery,
        setIsCartDrawerOpen,
        setIsAiChatOpen,
        navigate,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        applyCoupon,
        removeCoupon,
        showToast,
        removeToast,
        refreshProducts,
        refreshCategories,
        refreshPartners,
        refreshCompanyPages,
        refreshSmartOffers,
        refreshCoupons,
        refreshSolutions,
        refreshBanners,
        refreshSettings,
        cartSubtotal,
        cartShippingFee,
        cartGrandTotal,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
