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
    <section className="py-12 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">
              Industrial &amp; Home Solutions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Featured Categories
            </h2>
          </div>
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 hover:text-amber-600 transition-colors cursor-pointer"
          >
            <span>View All Products</span>
            <ArrowRight className="w-4 h-4" />
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
                className="group relative bg-neutral-50 hover:bg-white rounded-xl p-4 border border-neutral-200/80 hover:border-amber-400 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-white group-hover:bg-amber-500/10 border border-neutral-200 group-hover:border-amber-500/30 flex items-center justify-center transition-colors mb-3">
                    {getCategoryIcon(cat.slug)}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-amber-600 transition-colors leading-tight line-clamp-2">
                    {cat.name}
                  </h3>
                </div>

                <div className="mt-4 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>{count} {count === 1 ? 'Product' : 'Products'}</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
