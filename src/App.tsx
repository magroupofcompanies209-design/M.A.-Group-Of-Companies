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
import { CartPage } from './pages/CartPage';
import { CustomerAccountPage } from './pages/CustomerAccountPage';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { BuildSolutionPage } from './pages/BuildSolutionPage';
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
          <div className="min-h-screen bg-[#0D0E10] flex flex-col items-center justify-center text-[#FCFBF8]">
            <div className="w-10 h-10 border-2 border-[#C9B27C] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs tracking-[0.2em] text-[#C9B27C] uppercase font-medium">
              M.A. Group Executive Console...
            </p>
          </div>
        }
      >
        <AdminDashboard />
      </React.Suspense>
    );
  }

  // Storefront ON/OFF Maintenance Mode handling
  const isStorefrontOff =
    settings?.maintenanceMode === true || settings?.storefrontEnabled === false;

  if (isStorefrontOff) {
    return (
      <div className="min-h-screen bg-[#0D0E10] text-[#FCFBF8] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Subtle luxury ambient glow */}
        <div className="w-20 h-20 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/45 flex items-center justify-center text-[#C9B27C] mb-6 shadow-2xl relative">
          <Wrench className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2 mb-6">
          <div className="text-[11px] font-semibold text-[#C9B27C] tracking-[0.28em] uppercase">
            M.A. GROUP OF COMPANIES
          </div>
          <h1 className="font-luxury-serif font-semibold text-[#FCFBF8] text-2xl sm:text-4xl tracking-wide">
            We&apos;re Currently Working on Our Store
          </h1>
          <p className="text-[#C9B27C] font-medium text-sm sm:text-base tracking-wide pt-1">
            Something exciting is coming soon.
          </p>
        </div>

        <p className="max-w-lg text-[#B8B9BC] text-xs sm:text-sm mb-8 leading-relaxed">
          {settings?.maintenanceMessage ||
            "We're currently performing maintenance and improvements. Please check back shortly."}
        </p>

        {/* Professional Maintenance Progress Visual */}
        <div className="w-64 h-1.5 bg-[#151C2C] rounded-full overflow-hidden border border-[#C9B27C]/30 mb-8">
          <div className="w-2/3 h-full bg-[#C9B27C] rounded-full animate-pulse" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {settings?.whatsappNumber && (
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 font-semibold text-xs uppercase tracking-wider transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Concierge via WhatsApp</span>
            </a>
          )}
          <button
            onClick={() => navigate('admin')}
            className="text-xs text-[#B8B9BC] hover:text-[#C9B27C] underline tracking-wider cursor-pointer"
          >
            Executive / Administrator Access
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
      case 'cart':
        return <CartPage />;
      case 'account':
      case 'login':
      case 'my-account':
        return <CustomerAccountPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order-success':
        return <OrderSuccessPage />;
      case 'track-order':
        return <TrackOrderPage />;
      case 'wishlist':
        return <WishlistPage />;
      case 'b2b':
      case 'b2b-wholesale':
        return <B2BWholesalePage />;
      case 'solutions':
      case 'solution':
      case 'build-solution':
        return <BuildSolutionPage />;
      case 'company':
        return <CompanyProfilePage />;
      case 'about-us':
        return <CompanyProfilePage />;
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
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#292B30] selection:bg-[#C9B27C]/30 selection:text-[#0D0E10]">
      {/* Public Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">{renderCurrentView()}</main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer />

      {/* Floating AI Shopping Assistant ("M.A. Smart Assistant") */}
      <AiChatWidget />

      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border text-xs font-medium flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300 ${
              t.type === 'error'
                ? 'bg-[#0D0E10] text-[#FCFBF8] border-rose-500/50'
                : t.type === 'info'
                ? 'bg-[#0D0E10] text-[#FCFBF8] border-[#C9B27C]/40'
                : 'bg-[#0D0E10] text-[#FCFBF8] border-[#C9B27C]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-[#C9B27C] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#C9B27C] shrink-0" />
              )}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-[#B8B9BC] hover:text-[#FCFBF8] cursor-pointer"
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
