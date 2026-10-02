import React from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { CategoryShowcase } from '../components/home/CategoryShowcase';
import { FeaturedSection } from '../components/home/FeaturedSection';
import { AiBanner } from '../components/home/AiBanner';
import { BrandShowcase } from '../components/home/BrandShowcase';
import { ShieldCheck, Truck, RotateCcw, Clock, Award, Headphones } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-0">
      {/* 1. Hero Banner Slider */}
      <HeroSlider />

      {/* 2. Category Showcase */}
      <CategoryShowcase />

      {/* 3. Featured Products, Deals & Best Sellers */}
      <FeaturedSection />

      {/* 4. M.A. Smart AI Assistant Section */}
      <AiBanner />

      {/* 5. Brand Partners */}
      <BrandShowcase />

      {/* 6. Why Choose M.A. GROUP OF COMPANIES Section */}
      <section className="py-14 bg-[#0B0D10] text-white border-b border-[#1A1D23]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1 rounded-full">
              Trust &amp; Quality Benchmark
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Why Pakistan Chooses M.A. GROUP OF COMPANIES
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] max-w-lg mx-auto">
              Setting the standard for equipment reliability, honest pricing, and doorstep Cash on Delivery service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#111318] border border-[#1A1D23] hover:border-[#2B3038] transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">100% Genuine Certified Equipment</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Direct authorized distributor of Tier-1 solar brands, 99.99% pure copper cables, and European certified bathroom and kitchen fittings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111318] border border-[#1A1D23] hover:border-[#2B3038] transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Nationwide Cash on Delivery (COD)</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Zero advance payment risk. Place your order online, inspect the delivery at your home or construction site, and pay cash to the courier.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111318] border border-[#1A1D23] hover:border-[#2B3038] transition-colors space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Technical Sizing Engineering Help</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Our in-house electrical and solar specialists assist you with load calculations, wire selection, and inverter sizing via WhatsApp or phone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
