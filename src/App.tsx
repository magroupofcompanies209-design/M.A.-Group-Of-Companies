import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { AiChatWidget } from './components/ai/AiChatWidget';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { WishlistPage } from './pages/WishlistPage';
import { B2BWholesalePage } from './pages/B2BWholesalePage';
import {
  AboutUsPage,
  ContactUsPage,
  ShippingPolicyPage,
  ReturnPolicyPage,
  FaqPage,
} from './pages/StaticPages';
import { CheckCircle2, AlertCircle, Info, X, Wrench, MessageCircle } from 'lucide-react';

const AdminDashboard = React.lazy(() =>
  import('./admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

const MainRouter: React.FC = () => {
  const { currentRoute, toasts, removeToast, settings, navigate } = useStore();

  // If in Secure Admin or Admin route, render Admin Dashboard isolated from public header/footer
  if (currentRoute === 'secure-admin' || currentRoute === 'admin') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs tracking-widest text-neutral-400 uppercase font-mono">
              Loading M.A. Group Admin Portal...
            </p>
          </div>
        }
      >
        <AdminDashboard />
      </React.Suspense>
    );
  }

  // Maintenance mode handling
  if (settings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
          <Wrench className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-extrabold text-white text-2xl uppercase tracking-tight">
            M.A. Group of Companies
          </span>
        </div>
        <p className="text-amber-500 font-semibold tracking-wider uppercase text-xs mb-4">
          Under Scheduled Maintenance
        </p>
        <p className="max-w-md text-neutral-400 text-sm mb-8 leading-relaxed">
          {settings?.maintenanceMessage ||
            'We are currently performing routine catalog and inventory synchronization to better serve our nationwide customers. Please check back shortly.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {settings?.whatsappNumber && (
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact via WhatsApp</span>
            </a>
          )}
          <button
            onClick={() => navigate('admin')}
            className="text-xs text-neutral-500 hover:text-neutral-300 underline font-mono"
          >
            Staff / Administrator Access
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'shop':
      case 'category':
      case 'deals':
      case 'new-arrivals':
      case 'bestsellers':
        return <ShopPage />;
      case 'product':
        return <ProductDetailPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order-success':
        return <OrderSuccessPage />;
      case 'track-order':
        return <TrackOrderPage />;
      case 'wishlist':
        return <WishlistPage />;
      case 'b2b-wholesale':
        return <B2BWholesalePage />;
      case 'about-us':
        return <AboutUsPage />;
      case 'contact-us':
        return <ContactUsPage />;
      case 'shipping-policy':
        return <ShippingPolicyPage />;
      case 'return-policy':
      case 'privacy-policy':
      case 'terms-conditions':
        return <ReturnPolicyPage />;
      case 'faq':
        return <FaqPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-amber-500/20 selection:text-amber-900">
      {/* Public Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">{renderCurrentView()}</main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer />

      {/* Floating AI Shopping Assistant ("M.A. Smart Assistant") */}
      <AiChatWidget />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300 ${
              t.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : t.type === 'info'
                ? 'bg-neutral-900 text-neutral-100 border-neutral-800'
                : 'bg-emerald-950 text-emerald-100 border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Public Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainRouter />
    </StoreProvider>
  );
}
