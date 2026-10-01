import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate, settings, showToast } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setIsSubscribed(true);
    showToast('Thank you for subscribing to M.A. GROUP OF COMPANIES offers!', 'success');
  };

  return (
    <footer className="bg-neutral-950 text-neutral-300 border-t border-neutral-800 pt-12 pb-8">
      {/* 1. Value Proposition Trust Bar */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">100% Genuine Products</div>
              <div className="text-xs text-neutral-400 mt-0.5">Direct manufacturer warranties</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Cash on Delivery (COD)</div>
              <div className="text-xs text-neutral-400 mt-0.5">Pay at your doorstep across Pakistan</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">7-Day Return Guarantee</div>
              <div className="text-xs text-neutral-400 mt-0.5">For verified transit damages</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Engineering Support</div>
              <div className="text-xs text-neutral-400 mt-0.5">Solar & electrical sizing advisors</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
        {/* Brand & Corporate Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-amber-500/40 flex items-center justify-center shadow-md">
              <span className="text-amber-400 font-black text-lg tracking-tighter">M.A.</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-base tracking-tight uppercase">
                M.A. Group of Companies
              </span>
              <span className="text-[10px] text-amber-500 font-semibold tracking-widest uppercase">
                Modern Solutions. Quality Products.
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed pr-4">
            {settings?.footerAboutText ||
              'M.A. GROUP OF COMPANIES is a premier Pakistani distributor and supplier of certified Tier-1 solar energy equipment, heavy pure copper building cables, designer modular switches, European sanitary fixtures, heavy power tools, Italian-style kitchen hobs & hoods, and zero-emission electric motorbikes.'}
          </p>

          <div className="space-y-2 text-xs text-neutral-300">
            {settings?.showLocations && settings?.headOfficeAddress && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.headOfficeAddress}</span>
              </div>
            )}
            {settings?.showHelpline && settings?.contactPhone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{settings.contactPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings?.contactEmail || 'info@magroupofcompanies.pk'}</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-white uppercase tracking-wider">Categories</div>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li>
              <button
                onClick={() => navigate('category', { slug: 'solar-products' })}
                className="hover:text-amber-400 transition-colors"
              >
                Solar Panels &amp; Inverters
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'electrical-products' })}
                className="hover:text-amber-400 transition-colors"
              >
                Copper Cables &amp; Breakers
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'sanitary-products' })}
                className="hover:text-amber-400 transition-colors"
              >
                Luxury Faucets &amp; Showers
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'hardware-tools' })}
                className="hover:text-amber-400 transition-colors"
              >
                Power Tools &amp; Hardware
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'hobs-hoods' })}
                className="hover:text-amber-400 transition-colors"
              >
                Built-in Gas Hobs &amp; Hoods
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'ev-bikes' })}
                className="hover:text-amber-400 transition-colors"
              >
                EV Bikes &amp; Lithium Packs
              </button>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-white uppercase tracking-wider">Customer Care</div>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li>
              <button onClick={() => navigate('track-order')} className="hover:text-amber-400 transition-colors">
                Track Order
              </button>
            </li>
            <li>
              <button onClick={() => navigate('faq')} className="hover:text-amber-400 transition-colors">
                Frequently Asked Questions
              </button>
            </li>
            <li>
              <button onClick={() => navigate('shipping-policy')} className="hover:text-amber-400 transition-colors">
                Shipping &amp; Delivery (COD)
              </button>
            </li>
            <li>
              <button onClick={() => navigate('return-policy')} className="hover:text-amber-400 transition-colors">
                Return &amp; Refund Policy
              </button>
            </li>
            <li>
              <button onClick={() => navigate('b2b-wholesale')} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Wholesale / B2B Quotations
              </button>
            </li>
            <li>
              <button onClick={() => navigate('contact-us')} className="hover:text-amber-400 transition-colors">
                Contact &amp; Support
              </button>
            </li>
          </ul>
        </div>

        {/* Newsletter & COD Guarantee */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-white uppercase tracking-wider">Newsletter</div>
          <p className="text-xs text-neutral-400">
            Get exclusive Pakistani trade discounts, solar pricing updates, and new hardware arrivals.
          </p>

          {isSubscribed ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Subscribed successfully!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="relative">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Subscribe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="pt-2">
            <div className="text-[11px] text-neutral-400 uppercase font-semibold tracking-wider">
              Nationwide Delivery
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              Express Cash on Delivery service available across all 150+ cities in Pakistan via certified logistics partners.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <div>
          &copy; {new Date().getFullYear()} M.A. GROUP OF COMPANIES. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('privacy-policy')} className="hover:text-neutral-400">
            Privacy Policy
          </button>
          <span>&middot;</span>
          <button onClick={() => navigate('terms-conditions')} className="hover:text-neutral-400">
            Terms &amp; Conditions
          </button>
        </div>
      </div>
    </footer>
  );
};
