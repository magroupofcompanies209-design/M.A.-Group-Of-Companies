import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';
import { Flame, Sparkles, TrendingUp, Sun, ArrowRight } from 'lucide-react';

export const FeaturedSection: React.FC = () => {
  const { products, navigate } = useStore();
  const [activeTab, setActiveTab] = useState<'deals' | 'bestsellers' | 'solar' | 'new'>('deals');

  // Filter products based on active tab
  let filtered = products;
  if (activeTab === 'deals') {
    filtered = products.filter((p) => p.isDeal || (p.salePrice && p.salePrice < p.price));
  } else if (activeTab === 'bestsellers') {
    filtered = products.filter((p) => p.isBestSeller);
  } else if (activeTab === 'solar') {
    filtered = products.filter((p) => p.categoryId === 'cat-solar');
  } else if (activeTab === 'new') {
    filtered = products.filter((p) => p.isNewArrival);
  }

  // Fallback if empty
  if (filtered.length === 0) {
    filtered = products.slice(0, 8);
  }

  return (
    <section className="py-14 bg-neutral-50 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Header & Interactive Segmented Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Selected Wholesale &amp; Retail Offers
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Trending Equipment &amp; Deals
            </h2>
          </div>

          {/* Segmented Control Buttons (Anti-slop compliant) */}
          <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200 rounded-xl shadow-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'deals'
                  ? 'bg-neutral-900 text-amber-400 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Today&apos;s Deals</span>
            </button>

            <button
              onClick={() => setActiveTab('bestsellers')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'bestsellers'
                  ? 'bg-neutral-900 text-amber-400 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>Best Sellers</span>
            </button>

            <button
              onClick={() => setActiveTab('solar')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'solar'
                  ? 'bg-neutral-900 text-amber-400 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Solar Systems</span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-neutral-900 text-amber-400 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>New Arrivals</span>
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
        <div className="mt-10 text-center">
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <span>Explore Complete Store Catalog (PKR)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
