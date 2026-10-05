import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';
import { Flame, Sparkles, TrendingUp, Sun, ArrowRight } from 'lucide-react';

export const FeaturedSection: React.FC = () => {
  const { visibleProducts, navigate } = useStore();
  const [activeTab, setActiveTab] = useState<'new' | 'deals' | 'bestsellers' | 'solar'>('new');

  // Filter products based on active tab (only active storefront products, newest first)
  const activeProducts = [...visibleProducts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  let filtered = activeProducts;
  if (activeTab === 'deals') {
    filtered = activeProducts.filter((p) => p.isDeal || (p.salePrice && p.salePrice < p.price));
  } else if (activeTab === 'bestsellers') {
    filtered = activeProducts.filter((p) => p.isBestSeller || p.isFeatured);
  } else if (activeTab === 'solar') {
    filtered = activeProducts.filter(
      (p) =>
        p.categoryId === 'cat-solar' ||
        (p.categoryName && p.categoryName.toLowerCase().includes('solar'))
    );
  } else if (activeTab === 'new') {
    filtered = activeProducts;
  }

  // Fallback if empty
  if (filtered.length === 0) {
    filtered = activeProducts.slice(0, 8);
  }

  return (
    <section className="py-16 sm:py-20 bg-[#FCFBF8] border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Header & Interactive Segmented Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A98B52]"></span>
              <span>Showroom Selection</span>
            </div>
            <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight">
              Signature Equipment &amp; Collections
            </h2>
          </div>

          {/* Segmented Control Buttons */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#F7F3EA] border border-[#B8B9BC]/40 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                  : 'text-[#292B30]/75 hover:text-[#0D0E10]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>New Arrivals</span>
            </button>

            <button
              onClick={() => setActiveTab('bestsellers')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'bestsellers'
                  ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                  : 'text-[#292B30]/75 hover:text-[#0D0E10]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>Signature Pieces</span>
            </button>

            <button
              onClick={() => setActiveTab('deals')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'deals'
                  ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                  : 'text-[#292B30]/75 hover:text-[#0D0E10]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>Privileged Offers</span>
            </button>

            <button
              onClick={() => setActiveTab('solar')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'solar'
                  ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                  : 'text-[#292B30]/75 hover:text-[#0D0E10]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>Solar Systems</span>
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 shadow-sm cursor-pointer"
          >
            <span>Explore Complete Showroom Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
