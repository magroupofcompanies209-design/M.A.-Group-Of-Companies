import React from 'react';
import { useStore } from '../context/StoreContext';
import { BrandShowcase } from '../components/home/BrandShowcase';
import {
  Building2,
  Award,
  ShieldCheck,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const CompanyProfilePage: React.FC = () => {
  const { visibleCompanyPages, routeParams, navigate, settings } = useStore();

  const requestedSlug = routeParams.slug || 'about-ma-group';
  const currentPage =
    visibleCompanyPages.find(
      (p) => p.slug.toLowerCase() === requestedSlug.toLowerCase() || p.id === requestedSlug
    ) || visibleCompanyPages[0];

  if (!currentPage) {
    return (
      <div className="min-h-[70vh] bg-[#F7F3EA] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#FCFBF8] p-10 rounded-2xl border border-[#B8B9BC]/40 space-y-4">
          <Building2 className="w-10 h-10 text-[#C9B27C] mx-auto" />
          <h1 className="font-luxury-serif text-2xl font-semibold text-[#0D0E10]">
            Corporate Profile Page Unavailable
          </h1>
          <p className="text-xs text-[#292B30]/75">
            This corporate profile section is currently hidden or being updated by the executive team.
          </p>
          <button
            onClick={() => navigate('home')}
            className="px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all"
          >
            Return to Showroom
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] min-h-screen">
      {/* Top Corporate Hero Banner */}
      <section className="relative bg-[#0D0E10] text-[#FCFBF8] py-16 sm:py-24 overflow-hidden border-b border-[#C9B27C]/30">
        {currentPage.heroImage && (
          <div className="absolute inset-0 opacity-25">
            <img
              src={currentPage.heroImage}
              alt={currentPage.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D0E10] via-[#0D0E10]/85 to-transparent" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          {/* Sub-navigation pills across all visible Company Profile Pages */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {visibleCompanyPages.map((pg) => {
              const active = pg.id === currentPage.id;
              return (
                <button
                  key={pg.id}
                  onClick={() => navigate('company', { slug: pg.slug })}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#C9B27C] text-[#0D0E10] border-[#C9B27C] shadow-md'
                      : 'bg-[#151C2C]/80 text-[#FCFBF8] border-[#C9B27C]/30 hover:border-[#C9B27C]'
                  }`}
                >
                  {pg.title}
                </button>
              );
            })}
          </div>

          <div className="max-w-3xl space-y-4 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] text-[11px] font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentPage.subtitle || 'M.A. GROUP OF COMPANIES — CORPORATE HERITAGE'}</span>
            </div>
            <h1 className="font-luxury-serif text-3xl sm:text-5xl font-semibold text-[#FCFBF8] tracking-tight leading-tight">
              {currentPage.title}
            </h1>
            <p className="text-sm sm:text-base text-[#B8B9BC] leading-relaxed whitespace-pre-line">
              {currentPage.content}
            </p>
            {currentPage.buttonText && (
              <div className="pt-2">
                <button
                  onClick={() => navigate(currentPage.buttonLink || 'shop')}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-[0.16em] transition-all cursor-pointer shadow-lg"
                >
                  <span>{currentPage.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modular Corporate Sections */}
      {(currentPage.sections || []).length > 0 && (
        <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          {[...(currentPage.sections || [])]
            .sort((a, b) => (a.displayOrder ?? 1) - (b.displayOrder ?? 1))
            .map((sec, idx) => (
              <div
                key={sec.id || idx}
                className={`p-8 sm:p-12 rounded-2xl bg-[#FCFBF8] border border-[#B8B9BC]/40 shadow-xs grid grid-cols-1 ${
                  sec.image ? 'lg:grid-cols-12' : ''
                } gap-8 items-center`}
              >
                <div className={`${sec.image ? 'lg:col-span-7' : ''} space-y-4`}>
                  {sec.subheading && (
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A98B52]">
                      {sec.subheading}
                    </div>
                  )}
                  <h2 className="font-luxury-serif text-2xl sm:text-3xl font-semibold text-[#0D0E10]">
                    {sec.heading}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#292B30]/80 leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                  {sec.buttonText && (
                    <div className="pt-2">
                      <button
                        onClick={() => navigate(sec.buttonLink || 'shop')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <span>{sec.buttonText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {sec.image && (
                  <div className="lg:col-span-5">
                    <img
                      src={sec.image}
                      alt={sec.heading}
                      className="w-full h-64 sm:h-72 object-cover rounded-2xl border border-[#C9B27C]/40 shadow-md"
                    />
                  </div>
                )}
              </div>
            ))}
        </section>
      )}

      {/* If viewing Manufacturing Partners page, embed live BrandShowcase */}
      {currentPage.slug.includes('partner') && <BrandShowcase />}

      {/* Corporate Contact & Assurance Footer Strip */}
      <section className="py-14 bg-[#FCFBF8] border-t border-[#B8B9BC]/35">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
              Authorized Tier-1 Distribution
            </h3>
            <p className="text-xs text-[#292B30]/75 leading-relaxed">
              Every solar panel, hybrid inverter, pure copper cable, and architectural sanitary fixture carries official manufacturer warranty.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
              Build Your Custom Solution
            </h3>
            <p className="text-xs text-[#292B30]/75 leading-relaxed">
              Configure turnkey residential or commercial packages with our interactive Solution Builder and receive a permanent Quote Tracking Code.
            </p>
            <button
              onClick={() => navigate('solutions')}
              className="text-xs font-bold text-[#A98B52] hover:text-[#0D0E10] inline-flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>Launch Solution Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/35 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
              Executive Advisory Desk
            </h3>
            <div className="text-xs text-[#292B30]/80 space-y-1">
              {settings?.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#A98B52]" />
                  <span>{settings.contactPhone}</span>
                </div>
              )}
              {settings?.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#A98B52]" />
                  <span>{settings.contactEmail}</span>
                </div>
              )}
              {settings?.headOfficeAddress && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#A98B52] shrink-0" />
                  <span className="line-clamp-1">{settings.headOfficeAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
