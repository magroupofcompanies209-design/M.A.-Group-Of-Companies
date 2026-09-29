import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJsonResponse } from '../utils/api';
import {
  Product,
  Category,
  Brand,
  OrderItem,
  StoreSettings,
  HeroBanner,
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
  products: Product[];
  categories: Category[];
  brands: Brand[];
  banners: HeroBanner[];
  settings: StoreSettings | null;
  loading: boolean;
  cart: CartItem[];
  wishlist: string[]; // product IDs
  appliedCoupon: { code: string; discount: number; description: string } | null;
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
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

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
      const hash = window.location.hash.replace(/^#\/?/, '');

      // Check if accessing admin or secure-admin
      if (
        path.includes('secure-admin') ||
        hash.startsWith('secure-admin') ||
        path.includes('admin') ||
        hash.startsWith('admin')
      ) {
        setCurrentRoute('admin');
        return;
      }

      if (!hash) {
        setCurrentRoute('home');
        setRouteParams({});
        return;
      }

      const parts = hash.split('/');
      const main = parts[0];

      if (main === 'product' && parts[1]) {
        setCurrentRoute('product');
        setRouteParams({ id: parts[1] });
      } else if (main === 'category' && parts[1]) {
        setCurrentRoute('category');
        setRouteParams({ slug: parts[1] });
      } else if (main === 'order-success' && parts[1]) {
        setCurrentRoute('order-success');
        setRouteParams({ orderNumber: parts[1] });
      } else {
        setCurrentRoute(main || 'home');
        setRouteParams(parts[1] ? { param: parts[1] } : {});
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
    let hash = `#/${route}`;
    if (route === 'product' && params?.id) {
      hash = `#/product/${params.id}`;
    } else if (route === 'category' && params?.slug) {
      hash = `#/category/${params.slug}`;
    } else if (route === 'order-success' && params?.orderNumber) {
      hash = `#/order-success/${params.orderNumber}`;
    } else if (route === 'home') {
      hash = '#/';
    }

    window.location.hash = hash;
    setCurrentRoute(route);
    setRouteParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const [prodsRes, catsRes, brandsRes, bannersRes, settingsRes] = await Promise.all([
        fetch('/api/products').then((r) => safeJsonResponse(r, [])),
        fetch('/api/categories').then((r) => safeJsonResponse(r, [])),
        fetch('/api/brands').then((r) => safeJsonResponse(r, [])),
        fetch('/api/banners').then((r) => safeJsonResponse(r, [])),
        fetch('/api/settings').then((r) => safeJsonResponse(r, {})),
      ]);

      if (Array.isArray(prodsRes)) setProducts(prodsRes);
      if (Array.isArray(catsRes)) setCategories(catsRes);
      if (Array.isArray(brandsRes)) setBrands(brandsRes);
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
      const res = await fetch('/api/products');
      const data = await safeJsonResponse(res, []);
      if (Array.isArray(data)) setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await safeJsonResponse(res, []);
      if (Array.isArray(data)) setCategories(data);
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
      const res = await fetch('/api/settings');
      const data = await safeJsonResponse(res, {});
      if (data && !data.error) setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

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

  const freeThreshold = settings?.freeShippingThreshold || 5000;
  const standardFee = settings?.standardShippingFee || 450;
  const cartShippingFee = cartSubtotal === 0 || cartSubtotal >= freeThreshold ? 0 : standardFee;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const cartGrandTotal = Math.max(0, cartSubtotal - discount + cartShippingFee);

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        brands,
        banners,
        settings,
        loading,
        cart,
        wishlist,
        appliedCoupon,
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
