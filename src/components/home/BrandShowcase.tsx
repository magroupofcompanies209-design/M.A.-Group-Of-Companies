import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, Globe, ExternalLink, MapPin, Award, ArrowRight } from 'lucide-react';

export const BrandShowcase: React.FC = () => {
  const { visiblePartners, navigate, setSearchQuery } = useStore();
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  if (!visiblePartners || visiblePartners.length === 0) {
    return null;
  }

  const handleBrowsePartner = (partnerName: string) => {
    setSearchQuery(partnerName);
    navigate('shop');
  };

  return (
    <section className="py-16 sm:py-20 bg-[#F7F3EA] border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center space-y-2.5 mb-12">
          <div className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#A98B52]" />
            <span>Authorized Commercial &amp; Industrial Alliances</span>
          </div>
          <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight uppercase">
            CERTIFIED MANUFACTURING PARTNERS
          </h2>
          <p className="text-xs sm:text-sm text-[#292B30]/75 max-w-xl mx-auto">
            Trusted manufacturers and brands we work with.
          </p>
        </div>

        {/* Partners Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePartners.map((partner) => {
            const logoSrc = partner.logoUrl || partner.logo_url || '';
            const website = partner.websiteUrl || partner.website_url || '';
            const hasValidLogo = Boolean(logoSrc && !failedLogos[partner.id]);

            return (
              <div
                key={partner.id}
                className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#B8B9BC]/35 hover:border-[#C9B27C] transition-all duration-300 flex flex-col justify-between group shadow-xs hover:shadow-xl"
              >
                <div>
                  {/* Top Row: Logo + Partner Status / Country */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/35 group-hover:border-[#C9B27C]/60 flex items-center justify-center overflow-hidden shrink-0 p-2">
                      {hasValidLogo ? (
                        <img
                          src={logoSrc}
                          alt={partner.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedLogos((prev) => ({ ...prev, [partner.id]: true }))
                          }
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="font-luxury-serif font-bold text-base text-[#151C2C] tracking-wider">
                          {partner.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end text-right gap-1">
                      {partner.partnerStatus && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A98B52]">
                          {partner.partnerStatus}
                        </span>
                      )}
                      {partner.country && (
                        <div className="flex items-center gap-1 text-[11px] text-[#292B30]/70">
                          <MapPin className="w-3 h-3 text-[#C9B27C] shrink-0" />
                          <span>{partner.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manufacturer Name */}
                  <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10] group-hover:text-[#151C2C] transition-colors">
                    {partner.name}
                  </h3>

                  {/* Short Description */}
                  {partner.description && (
                    <p className="text-xs text-[#292B30]/75 leading-relaxed mt-2 line-clamp-2">
                      {partner.description}
                    </p>
                  )}

                  {/* Certification Info */}
                  {partner.certification && (
                    <div className="mt-3.5 pt-3 border-t border-[#B8B9BC]/25 flex items-center gap-1.5 text-[11px] text-[#151C2C] font-medium">
                      <Award className="w-3.5 h-3.5 text-[#A98B52] shrink-0" />
                      <span className="truncate">{partner.certification}</span>
                    </div>
                  )}

                  {/* Product Categories */}
                  {Array.isArray(partner.categories) && partner.categories.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#292B30]/65">
                      {partner.categories.map((cat, idx) => (
                        <React.Fragment key={cat}>
                          {idx > 0 && <span aria-hidden="true">&middot;</span>}
                          <span>{cat}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions: View Products + Website Link */}
                <div className="mt-5 pt-3.5 border-t border-[#B8B9BC]/25 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleBrowsePartner(partner.name)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#151C2C] hover:text-[#A98B52] transition-colors cursor-pointer"
                  >
                    <span>Explore Products</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#292B30]/65 hover:text-[#0D0E10] transition-colors"
                      title={`Visit ${partner.name} official website`}
                    >
                      <Globe className="w-3 h-3 text-[#C9B27C]" />
                      <span>Official Site</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
