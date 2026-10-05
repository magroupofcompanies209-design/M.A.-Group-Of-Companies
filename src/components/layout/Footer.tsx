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
    showToast('Thank you for subscribing to M.A. GROUP OF COMPANIES private dispatches.', 'success');
  };

  return (
    <footer className="bg-[#0D0E10] text-[#FCFBF8] border-t border-[#C9B27C]/25 pt-16 pb-10">
      {/* 1. Executive Assurance Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-7 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/25 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#C9B27C]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#FCFBF8] tracking-wide">
                100% Certified Authentic
              </div>
              <div className="text-xs text-[#B8B9BC] mt-0.5">Official manufacturer warranties</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-[#C9B27C]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#FCFBF8] tracking-wide">
                Cash on Delivery (COD)
              </div>
              <div className="text-xs text-[#B8B9BC] mt-0.5">Inspect at doorstep across Pakistan</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-[#C9B27C]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#FCFBF8] tracking-wide">
                7-Day Protection
              </div>
              <div className="text-xs text-[#B8B9BC] mt-0.5">Guaranteed transit replacement</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#C9B27C]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#FCFBF8] tracking-wide">
                Engineering Advisory
              </div>
              <div className="text-xs text-[#B8B9BC] mt-0.5">Dedicated load &amp; sizing specialists</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Luxury Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
        {/* Brand & Corporate Overview */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#151C2C] border border-[#C9B27C]/50 flex items-center justify-center">
              <span className="font-luxury-serif text-[#C9B27C] font-bold text-lg tracking-wider">
                M.A
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-luxury-serif font-semibold text-[#FCFBF8] text-lg tracking-[0.08em] uppercase">
                M.A. Group of Companies
              </span>
              <span className="text-[10px] text-[#C9B27C] font-medium tracking-[0.22em] uppercase">
                Architectural &amp; Energy Excellence
              </span>
            </div>
          </div>

          <p className="text-xs text-[#B8B9BC] leading-relaxed pr-4">
            {settings?.footerAboutText ||
              'M.A. GROUP OF COMPANIES is Pakistan’s premier destination for Tier-1 solar energy infrastructure, pure copper electrical systems, architectural sanitary ware, precision hardware, built-in kitchen hobs & hoods, and zero-emission electric mobility.'}
          </p>

          <div className="space-y-2.5 text-xs text-[#FCFBF8] pt-1">
            {settings?.showLocations && settings?.headOfficeAddress && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C9B27C] shrink-0 mt-0.5" />
                <span className="text-[#B8B9BC]">{settings.headOfficeAddress}</span>
              </div>
            )}
            {settings?.showHelpline && settings?.contactPhone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C9B27C] shrink-0" />
                <span className="text-[#B8B9BC]">{settings.contactPhone}</span>
              </div>
            )}
            {settings?.contactEmail && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C9B27C] shrink-0" />
                <span className="text-[#B8B9BC]">{settings.contactEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Curated Collections */}
        <div className="space-y-4">
          <div className="font-luxury-serif text-sm font-semibold text-[#C9B27C] uppercase tracking-[0.16em]">
            Collections
          </div>
          <ul className="space-y-2.5 text-xs text-[#B8B9BC]">
            <li>
              <button
                onClick={() => navigate('category', { slug: 'solar-products' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Solar Panels &amp; Inverters
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'electrical-products' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Electrical &amp; Copper Cables
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'sanitary-products' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Luxury Sanitary &amp; Faucets
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'hardware-tools' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Hardware &amp; Power Tools
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'hobs-hoods' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Built-In Kitchen Hobs &amp; Hoods
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('category', { slug: 'ev-bikes' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                EV Bikes &amp; Lithium Mobility
              </button>
            </li>
          </ul>
        </div>

        {/* Client Concierge */}
        <div className="space-y-4">
          <div className="font-luxury-serif text-sm font-semibold text-[#C9B27C] uppercase tracking-[0.16em]">
            Client Care
          </div>
          <ul className="space-y-2.5 text-xs text-[#B8B9BC]">
            <li>
              <button
                onClick={() => navigate('company', { slug: 'about-ma-group' })}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Company Profile &amp; Heritage
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('solutions')}
                className="text-[#C9B27C] hover:text-[#FCFBF8] font-medium transition-colors cursor-pointer"
              >
                Build Your Solution
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('track-order')}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Track Order / Quote Code
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('shipping-policy')}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Cash on Delivery Policy
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('b2b-wholesale')}
                className="text-[#C9B27C] hover:text-[#FCFBF8] font-medium transition-colors cursor-pointer"
              >
                Commercial &amp; B2B Quotations
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('contact-us')}
                className="hover:text-[#C9B27C] transition-colors cursor-pointer"
              >
                Contact Showroom
              </button>
            </li>
          </ul>
        </div>

        {/* Private Journal & Dispatch */}
        <div className="space-y-4">
          <div className="font-luxury-serif text-sm font-semibold text-[#C9B27C] uppercase tracking-[0.16em]">
            Private Dispatch
          </div>
          <p className="text-xs text-[#B8B9BC] leading-relaxed">
            Receive trade schedules, solar tariff updates, and new architectural collection previews.
          </p>

          {isSubscribed ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Registered for updates.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2.5">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-[#151C2C] border border-[#B8B9BC]/25 rounded-lg px-3.5 py-2.5 text-xs text-[#FCFBF8] placeholder-[#B8B9BC]/60 focus:outline-none focus:border-[#C9B27C]"
              />
              <button
                type="submit"
                className="bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>Subscribe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 3. Bottom Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 border-t border-[#B8B9BC]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#B8B9BC]">
        <div className="tracking-wide">
          &copy; {new Date().getFullYear()} <span className="text-[#FCFBF8] font-medium">M.A. GROUP OF COMPANIES</span>. All rights reserved.
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('privacy-policy')}
            className="hover:text-[#C9B27C] transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-[#B8B9BC]/30">&middot;</span>
          <button
            onClick={() => navigate('terms-conditions')}
            className="hover:text-[#C9B27C] transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <span className="text-[#B8B9BC]/30">&middot;</span>
          <button
            onClick={() => navigate('faq')}
            className="hover:text-[#C9B27C] transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </div>
      </div>
    </footer>
  );
};
