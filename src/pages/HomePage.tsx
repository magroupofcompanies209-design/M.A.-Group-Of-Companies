import React from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { CategoryShowcase } from '../components/home/CategoryShowcase';
import { FeaturedSection } from '../components/home/FeaturedSection';
import { AiBanner } from '../components/home/AiBanner';
import { BrandShowcase } from '../components/home/BrandShowcase';
import { useStore } from '../context/StoreContext';
import {
  Truck,
  Award,
  Headphones,
  Flame,
  Clock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Building2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { activeSmartOffers, settings, visibleSolutions, navigate } = useStore();

  const homepageOffers = activeSmartOffers.filter((o) => o.showOnHomepage !== false);
  const hpCompany = settings?.homepageCompanySection || {
    heading: 'Building Trust Through Quality',
    subheading: 'M.A. GROUP OF COMPANIES — CORPORATE HERITAGE',
    description:
      'For discerning homeowners, architects, and industrial contractors across Pakistan, M.A. Group delivers certified Tier-1 solar energy, 99.99% pure copper electrical engineering, luxury sanitary fittings, and custom technical solutions.',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    buttonText: 'Learn About Us',
    buttonLink: 'company/about-ma-group',
    isVisible: true,
    displayOrder: 1,
    highlights: [
      'ISO & PEC Compliant Engineering Standards',
      'Direct Authorized Partnerships with Global Brands',
      'Nationwide Cash on Delivery & Project Logistics',
    ],
  };

  return (
    <div className="space-y-0">
      {/* 1. Hero Banner Slider */}
      <HeroSlider />

      {/* 1B. Active Smart Offers & Flash Sales Showcase */}
      {homepageOffers.length > 0 && (
        <section className="py-12 sm:py-16 bg-[#0D0E10] text-[#FCFBF8] border-b border-[#C9B27C]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[#C9B27C] text-[11px] font-bold uppercase tracking-[0.22em]">
                  <Flame className="w-4 h-4" />
                  <span>EXCLUSIVE PROMOTIONAL CAMPAIGNS</span>
                </div>
                <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#FCFBF8] mt-1">
                  Smart Offers &amp; Limited-Time Deals
                </h2>
              </div>
              <button
                onClick={() => navigate('deals')}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#C9B27C] hover:text-[#FCFBF8] cursor-pointer"
              >
                <span>View All Active Offers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {homepageOffers.slice(0, 3).map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl bg-[#151C2C] border border-[#C9B27C]/35 hover:border-[#C9B27C] transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative h-44 bg-[#0D0E10] overflow-hidden">
                      {offer.bannerImage && (
                        <img
                          src={offer.bannerImage}
                          alt={offer.name}
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-3 py-1 rounded-md bg-[#C9B27C] text-[#0D0E10] text-[10px] font-black uppercase tracking-wider">
                          {offer.badgeText || offer.offerType}
                        </span>
                      </div>
                      {offer.countdownTimerEnabled && offer.endDate && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-[#0D0E10]/90 border border-[#C9B27C]/40 text-[#C9B27C] text-[10px] font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Valid till {new Date(offer.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="text-[11px] font-bold text-[#C9B27C] uppercase tracking-wider">
                        {offer.discountPercentage
                          ? `Save ${offer.discountPercentage}% Automatically`
                          : offer.fixedDiscountAmount
                          ? `Instant PKR ${offer.fixedDiscountAmount.toLocaleString()} Savings`
                          : offer.offerType}
                      </div>
                      <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
                        {offer.name}
                      </h3>
                      <p className="text-xs text-[#B8B9BC] line-clamp-2 leading-relaxed">
                        {offer.shortDescription}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-3.5 bg-[#0D0E10]/60 border-t border-[#C9B27C]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#B8B9BC]">
                      {offer.minOrderValue
                        ? `Min Order: PKR ${offer.minOrderValue.toLocaleString()}`
                        : 'Storewide Eligibility'}
                    </span>
                    <button
                      onClick={() => navigate(offer.ctaLink || 'deals')}
                      className="text-xs font-bold text-[#C9B27C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{offer.ctaText || 'Shop Offer'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Category Showcase (Warm Ivory) */}
      <CategoryShowcase />

      {/* 3. Featured Products, Deals & Best Sellers (Pearl White) */}
      <FeaturedSection />

      {/* 3B. Build Your Complete Solution Showcase */}
      {visibleSolutions.length > 0 && (
        <section className="py-16 bg-[#F7F3EA] text-[#292B30] border-b border-[#B8B9BC]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[#A98B52] text-[11px] font-bold uppercase tracking-[0.22em]">
                  <Cpu className="w-4 h-4" />
                  <span>INTERACTIVE TURNKEY PACKAGES</span>
                </div>
                <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] mt-1">
                  Build Your Complete Solution
                </h2>
                <p className="text-xs sm:text-sm text-[#292B30]/75 mt-1 max-w-2xl">
                  Configure complete Solar, House Wiring, Sanitary, Kitchen, and EV packages tailored to your property size and budget tier.
                </p>
              </div>
              <button
                onClick={() => navigate('solutions')}
                className="px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
              >
                <span>Open Solution Configurator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleSolutions.slice(0, 3).map((sol) => (
                <div
                  key={sol.id}
                  onClick={() => navigate('solutions')}
                  className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#B8B9BC]/40 hover:border-[#C9B27C] transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="px-2.5 py-1 rounded bg-[#151C2C] text-[#C9B27C]">
                        {sol.solutionType}
                      </span>
                      <span className="text-[#A98B52]">
                        {sol.targetPropertyType} • {sol.propertySize}
                      </span>
                    </div>
                    <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                      {sol.name}
                    </h3>
                    <p className="text-xs text-[#292B30]/75 line-clamp-2">{sol.description}</p>
                  </div>
                  <div className="pt-3 border-t border-[#B8B9BC]/25 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0D0E10]">
                      PKR {(sol.estimatedMinPrice || 0).toLocaleString()} –{' '}
                      {(sol.estimatedMaxPrice || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-[#A98B52] inline-flex items-center gap-1">
                      Configure <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. M.A. Technical Sizing Concierge (Midnight Navy) */}
      <AiBanner />

      {/* 5. Brand Partners (Warm Ivory) */}
      <BrandShowcase />

      {/* 5B. Admin-Controlled Homepage Company Introduction Section */}
      {hpCompany.isVisible !== false && (
        <section className="py-16 sm:py-20 bg-[#0D0E10] text-[#FCFBF8] border-b border-[#C9B27C]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] text-[11px] font-semibold uppercase tracking-[0.2em]">
                <Building2 className="w-3.5 h-3.5" />
                <span>{hpCompany.subheading || 'M.A. GROUP OF COMPANIES'}</span>
              </div>
              <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#FCFBF8] tracking-tight">
                {hpCompany.heading}
              </h2>
              <p className="text-xs sm:text-sm text-[#B8B9BC] leading-relaxed">
                {hpCompany.description}
              </p>
              {Array.isArray(hpCompany.highlights) && hpCompany.highlights.length > 0 && (
                <div className="space-y-2 pt-1">
                  {hpCompany.highlights.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[#FCFBF8]">
                      <CheckCircle2 className="w-4 h-4 text-[#C9B27C] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const link = hpCompany.buttonLink || 'company/about-ma-group';
                    if (link.startsWith('company/')) {
                      navigate('company', { slug: link.replace('company/', '') });
                    } else {
                      navigate(link);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-[0.16em] transition-all cursor-pointer"
                >
                  <span>{hpCompany.buttonText || 'Learn About Us'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {hpCompany.image && (
              <div className="lg:col-span-5">
                <img
                  src={hpCompany.image}
                  alt={hpCompany.heading}
                  className="w-full h-72 sm:h-88 object-cover rounded-2xl border border-[#C9B27C]/40 shadow-2xl"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. Why Choose M.A. GROUP OF COMPANIES Section (Pearl White) */}
      <section className="py-16 sm:py-20 bg-[#FCFBF8] text-[#292B30] border-b border-[#B8B9BC]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-2.5 mb-12">
            <span className="inline-block text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em]">
              The M.A. Standard of Excellence
            </span>
            <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight">
              Why Discerning Clients Choose M.A. Group
            </h2>
            <p className="text-xs sm:text-sm text-[#292B30]/70 max-w-lg mx-auto">
              Combining architectural sophistication, verified manufacturer engineering, and seamless nationwide Cash on Delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            <div className="p-7 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 hover:border-[#C9B27C] transition-all space-y-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
                100% Genuine Certified Equipment
              </h3>
              <p className="text-xs text-[#292B30]/75 leading-relaxed">
                Authorized distribution of Tier-1 solar systems, 99.99% pure copper cables, and European-standard sanitary and kitchen fittings.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 hover:border-[#C9B27C] transition-all space-y-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
                Nationwide Cash on Delivery (COD)
              </h3>
              <p className="text-xs text-[#292B30]/75 leading-relaxed">
                Zero advance payment risk. Place your order online, inspect the physical delivery at your residence or project site, and pay cash upon arrival.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 hover:border-[#C9B27C] transition-all space-y-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
                Dedicated Engineering Advisory
              </h3>
              <p className="text-xs text-[#292B30]/75 leading-relaxed">
                Our in-house electrical and solar specialists assist you with load calculations, wire gauge selection, and inverter sizing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
