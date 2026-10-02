import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck } from 'lucide-react';

export const BrandShowcase: React.FC = () => {
  const { brands, navigate } = useStore();

  return (
    <section className="py-12 bg-[#0B0D10] border-b border-[#1A1D23]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-1 mb-8">
          <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
            <span>Authorized Commercial Partnerships</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Certified Manufacturing Brands
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {brands.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                navigate('shop');
              }}
              className="p-4 rounded-xl bg-[#111318] hover:bg-[#1A1D23] border border-[#2B3038] hover:border-[#2563EB] hover:shadow-md transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-1.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1A1D23] text-[#3B82F6] border border-[#2B3038] flex items-center justify-center font-black text-xs group-hover:scale-105 group-hover:border-[#2563EB]/50 transition-all">
                {b.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-[#3B82F6] transition-colors leading-tight">
                {b.name}
              </div>
              {b.description && (
                <div className="text-[10px] text-[#6B7280] line-clamp-1">
                  {b.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
