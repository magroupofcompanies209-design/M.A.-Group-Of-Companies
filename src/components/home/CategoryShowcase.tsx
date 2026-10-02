import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sun, Zap, Droplet, Wrench, Flame, Bike, Activity, ArrowRight } from 'lucide-react';

export const CategoryShowcase: React.FC = () => {
  const { categories, products, navigate } = useStore();

  const getCategoryIcon = (slug: string) => {
    if (slug.includes('solar')) return <Sun className="w-5 h-5 text-amber-500" />;
    if (slug.includes('electrical')) return <Zap className="w-5 h-5 text-blue-500" />;
    if (slug.includes('sanitary')) return <Droplet className="w-5 h-5 text-cyan-500" />;
    if (slug.includes('hardware')) return <Wrench className="w-5 h-5 text-orange-500" />;
    if (slug.includes('hob')) return <Flame className="w-5 h-5 text-rose-500" />;
    if (slug.includes('ev')) return <Bike className="w-5 h-5 text-emerald-500" />;
    return <Activity className="w-5 h-5 text-neutral-500" />;
  };

  return (
    <section className="py-12 bg-[#0B0D10] border-b border-[#1A1D23]">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest mb-1">
              Industrial &amp; Home Solutions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Featured Categories
            </h2>
          </div>
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
          >
            <span>View All Products</span>
            <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                onClick={() => navigate('category', { slug: cat.slug })}
                className="group relative bg-[#111318] hover:bg-[#1A1D23] rounded-xl p-4 border border-[#2B3038] hover:border-[#2563EB] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#1A1D23] group-hover:bg-[#2563EB]/15 border border-[#2B3038] group-hover:border-[#2563EB]/40 flex items-center justify-center transition-colors mb-3">
                    {getCategoryIcon(cat.slug)}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#3B82F6] transition-colors leading-tight line-clamp-2">
                    {cat.name}
                  </h3>
                </div>

                <div className="mt-4 pt-2 border-t border-[#2B3038] flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span>{count} {count === 1 ? 'Product' : 'Products'}</span>
                  <ArrowRight className="w-3 h-3 text-[#6B7280] group-hover:text-[#3B82F6] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
