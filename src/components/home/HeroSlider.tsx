import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const HeroSlider: React.FC = () => {
  const { banners, navigate } = useStore();
  const [currentIdx, setCurrentIdx] = useState(0);

  const activeBanners = banners.filter((b) => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
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
    <div className="relative w-full bg-neutral-950 overflow-hidden min-h-[460px] sm:min-h-[520px] flex items-center">
      {/* Background Image with Cinematic Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-full object-cover object-center opacity-30 transform scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/40"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 sm:py-24 w-full">
        <div className="max-w-2xl space-y-5">
          {banner.badge && (
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              {banner.badge}
            </div>
          )}

          <div className="text-xs sm:text-sm font-bold text-neutral-400 uppercase tracking-widest">
            {banner.subtitle}
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            {banner.title}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed line-clamp-3">
            {banner.description}
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                if (banner.ctaLink.startsWith('/')) {
                  navigate(banner.ctaLink.replace(/^\//, ''));
                } else {
                  navigate('shop');
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm px-7 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <span>{banner.ctaText || 'SHOP CATALOG'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {banner.secondaryCtaText && (
              <button
                onClick={() => {
                  if (banner.secondaryCtaLink?.includes('b2b')) {
                    navigate('b2b-wholesale');
                  } else if (banner.secondaryCtaLink?.includes('deals')) {
                    navigate('deals');
                  } else {
                    navigate('shop');
                  }
                }}
                className="bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
              >
                {banner.secondaryCtaText}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center backdrop-blur border border-neutral-700 transition-colors cursor-pointer"
            aria-label="Previous Banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center backdrop-blur border border-neutral-700 transition-colors cursor-pointer"
            aria-label="Next Banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIdx === idx ? 'w-8 bg-blue-500' : 'w-2 bg-neutral-600'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
