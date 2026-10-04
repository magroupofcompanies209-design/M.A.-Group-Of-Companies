import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';
import { Flame, Sparkles, TrendingUp, Sun, ArrowRight } from 'lucide-react';

export const FeaturedSection: React.FC = () => {
  const { products, navigate } = useStore();
  const [activeTab, setActiveTab] = useState<'deals' | 'bestsellers' | 'solar' | 'new'>('deals');

  // Filter products based on active tab (only active storefront products)
  const activeProducts = products.filter((p) => p.status !== 'archived' && p.status !== 'inactive' && !p.isArchived);
  let filtered = activeProducts;
  if (activeTab === 'deals') {
    filtered = activeProducts.filter((p) => p.isDeal || (p.salePrice && p.salePrice < p.price));
  } else if (activeTab === 'bestsellers') {
    filtered = activeProducts.filter((p) => p.isBestSeller || p.isFeatured);
  } else if (activeTab === 'solar') {
    filtered = activeProducts.filter((p) => p.categoryId === 'cat-solar');
  } else if (activeTab === 'new') {
    filtered = activeProducts.filter((p) => p.isNewArrival);
  }

  // Fallback if empty
  if (filtered.length === 0) {
    filtered = activeProducts.slice(0, 8);
  }

  return (
    <section className="py-14 bg-[#0B0D10] border-b border-[#1A1D23]">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Header & Interactive Segmented Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
              Selected Wholesale &amp; Retail Offers
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Trending Equipment &amp; Deals
            </h2>
          </div>

          {/* Segmented Control Buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#111318] border border-[#2B3038] rounded-xl shadow-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'deals'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Today&apos;s Deals</span>
            </button>

            <button
              onClick={() => setActiveTab('bestsellers')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'bestsellers'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Best Sellers</span>
            </button>

            <button
              onClick={() => setActiveTab('solar')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'solar'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-blue-300" />
              <span>Solar Systems</span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#111318] border border-[#2B3038] hover:border-[#2563EB] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <span>Explore Complete Store Catalog (PKR)</span>
            <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
          </button>
        </div>
      </div>
    </section>
  );
};
