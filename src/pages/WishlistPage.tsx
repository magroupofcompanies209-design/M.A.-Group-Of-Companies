import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { Heart, ArrowRight } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, navigate } = useStore();

  const savedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1D23]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
              <span>Your Saved Wishlist</span>
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              {savedProducts.length} {savedProducts.length === 1 ? 'item' : 'items'} saved for quick ordering with Cash on Delivery.
            </p>
          </div>

          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
          </button>
        </div>

        {savedProducts.length === 0 ? (
          <div className="bg-[#111318] rounded-3xl p-16 text-center border border-[#2B3038] space-y-4 max-w-md mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-950/40 text-rose-400 mx-auto flex items-center justify-center border border-rose-900">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Your wishlist is empty</h3>
            <p className="text-xs text-[#6B7280]">
              Save equipment while browsing our solar, electrical, and hardware catalog to review anytime.
            </p>
            <button
              onClick={() => navigate('shop')}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-6 py-3 rounded-xl text-xs cursor-pointer transition-colors shadow-lg shadow-blue-500/20"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {savedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
