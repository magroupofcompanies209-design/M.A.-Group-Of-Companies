import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck } from 'lucide-react';

export const BrandShowcase: React.FC = () => {
  const { brands, navigate } = useStore();

  return (
    <section className="py-12 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-1 mb-8">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Authorized Commercial Partnerships</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
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
              className="p-4 rounded-xl bg-neutral-50 hover:bg-white border border-neutral-200/80 hover:border-amber-400 hover:shadow-xs transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-1.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center font-black text-xs group-hover:scale-105 transition-transform">
                {b.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-bold text-neutral-800 group-hover:text-amber-600 transition-colors leading-tight">
                {b.name}
              </div>
              {b.description && (
                <div className="text-[10px] text-neutral-400 line-clamp-1">
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
