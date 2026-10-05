import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';

export const HeroSlider: React.FC = () => {
  const { banners, navigate } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);

  const activeBanners = banners.filter((b) => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) return null;

  const banner = activeBanners[currentIdx] || activeBanners[0];

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  return (
    <div className="relative w-full bg-[#0D0E10] overflow-hidden min-h-[520px] sm:min-h-[600px] flex items-center border-b border-[#C9B27C]/25">
      {/* Background Image with Subtle Luxury Lighting & Obsidian Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-full object-cover object-center opacity-40 transform scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0E10] via-[#0D0E10]/85 to-[#0D0E10]/25"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10] via-transparent to-[#0D0E10]/40"></div>
        {/* Subtle Champagne Gold Ambient Glow */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#C9B27C]/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Hero Editorial Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 w-full">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2.5 text-[11px] font-medium text-[#C9B27C] uppercase tracking-[0.22em] bg-[#151C2C]/90 border border-[#C9B27C]/40 px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9B27C]"></span>
            <span>{banner.badge || banner.subtitle || 'M.A. GROUP OF COMPANIES'}</span>
          </div>

          <h1 className="font-luxury-serif text-3xl sm:text-5xl lg:text-6xl font-semibold text-[#FCFBF8] tracking-tight leading-[1.12]">
            {banner.title}
          </h1>

          <p className="text-sm sm:text-base text-[#B8B9BC] leading-relaxed max-w-xl font-normal">
            {banner.description}
          </p>

          {/* Strong Luxury CTA Buttons */}
          <div className="pt-3 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => {
                if (banner.ctaLink && banner.ctaLink.startsWith('/')) {
                  navigate(banner.ctaLink.replace(/^\//, ''));
                } else {
                  navigate('shop');
                }
              }}
              className="bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-semibold text-xs sm:text-sm px-7 py-3.5 rounded-lg flex items-center gap-2.5 uppercase tracking-[0.12em] transition-all duration-300 shadow-lg cursor-pointer"
            >
              <span>{banner.ctaText || 'Explore Collection'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('shop')}
              className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-lg uppercase tracking-[0.12em] transition-all duration-300 cursor-pointer"
            >
              Shop Now
            </button>

            <button
              onClick={() => navigate('b2b-wholesale')}
              className="bg-transparent hover:bg-[#FCFBF8]/10 text-[#C9B27C] border border-[#B8B9BC]/30 hover:border-[#C9B27C] font-medium text-xs sm:text-sm px-6 py-3.5 rounded-lg uppercase tracking-[0.12em] transition-all duration-300 cursor-pointer"
            >
              Request a Quote
            </button>
          </div>

          <div className="pt-2 flex items-center gap-5 text-xs text-[#B8B9BC]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C9B27C]" />
              <span>100% Authentic Manufacturer Warranty</span>
            </div>
            <span className="text-[#B8B9BC]/30">&bull;</span>
            <span>Nationwide Cash on Delivery</span>
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0D0E10]/70 hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] flex items-center justify-center backdrop-blur-md border border-[#C9B27C]/30 transition-all cursor-pointer"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0D0E10]/70 hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] flex items-center justify-center backdrop-blur-md border border-[#C9B27C]/30 transition-all cursor-pointer"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Minimalist Gold Indicator Bar */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIdx === idx ? 'w-10 bg-[#C9B27C]' : 'w-2.5 bg-[#B8B9BC]/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
