import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sun, Zap, Droplet, Wrench, Flame, Bike, Wind, Activity, ArrowRight } from 'lucide-react';

export const CategoryShowcase: React.FC = () => {
  const { visibleCategories, visibleProducts, navigate } = useStore();

  const getCategoryIcon = (slug: string, name: string) => {
    const key = `${slug} ${name}`.toLowerCase();
    if (key.includes('solar')) return <Sun className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('electrical')) return <Zap className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('sanitary')) return <Droplet className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('hardware')) return <Wrench className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('hood')) return <Wind className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('hob') || key.includes('kitchen')) return <Flame className="w-5 h-5 text-[#A98B52]" />;
    if (key.includes('ev')) return <Bike className="w-5 h-5 text-[#A98B52]" />;
    return <Activity className="w-5 h-5 text-[#A98B52]" />;
  };

  return (
    <section className="py-16 sm:py-20 bg-[#F7F3EA] border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] mb-2">
              Architectural &amp; Engineering Divisions
            </div>
            <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight">
              Curated Product Categories
            </h2>
          </div>
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#151C2C] hover:text-[#A98B52] transition-colors cursor-pointer"
          >
            <span>Explore Full Catalog</span>
            <ArrowRight className="w-4 h-4 text-[#A98B52]" />
          </button>
        </div>

        {/* Dynamic Supabase Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {visibleCategories.map((cat) => {
            const count = visibleProducts.filter(
              (p) =>
                p.categoryId === cat.id ||
                p.categoryId.toLowerCase() === cat.slug.toLowerCase() ||
                (p.categoryName && p.categoryName.toLowerCase() === cat.name.toLowerCase())
            ).length;

            return (
              <div
                key={cat.id}
                onClick={() => navigate('category', { slug: cat.slug })}
                className="group relative bg-[#FCFBF8] hover:bg-[#151C2C] rounded-xl p-5 border border-[#B8B9BC]/35 hover:border-[#C9B27C] shadow-xs hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-lg bg-[#F7F3EA] group-hover:bg-[#0D0E10] border border-[#B8B9BC]/35 group-hover:border-[#C9B27C]/50 flex items-center justify-center transition-colors mb-4">
                    {getCategoryIcon(cat.slug, cat.name)}
                  </div>
                  <h3 className="font-luxury-serif text-sm sm:text-base font-semibold text-[#0D0E10] group-hover:text-[#FCFBF8] transition-colors leading-snug line-clamp-2">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-[11px] text-[#292B30]/65 group-hover:text-[#B8B9BC] line-clamp-2 mt-1.5 transition-colors">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#B8B9BC]/25 group-hover:border-[#B8B9BC]/15 flex items-center justify-between text-[11px] text-[#292B30]/70 group-hover:text-[#C9B27C] font-medium">
                  <span>
                    {count} {count === 1 ? 'Piece' : 'Pieces'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#A98B52] group-hover:text-[#C9B27C] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
