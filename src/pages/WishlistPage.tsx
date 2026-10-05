import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { Heart, ArrowRight } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, navigate } = useStore();

  const savedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-14 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A98B52] block mb-1.5">
              Personal Showroom Selection
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0D0E10] tracking-tight flex items-center gap-3">
              <span>Saved Wishlist</span>
            </h1>
            <p className="text-xs text-[#5A5D64] mt-1.5">
              {savedProducts.length} {savedProducts.length === 1 ? 'item' : 'items'} saved for quick ordering with Cash on Delivery.
            </p>
          </div>

          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#151C2C] hover:text-[#A98B52] transition-colors cursor-pointer"
          >
            <span>Continue Exploring</span>
            <ArrowRight className="w-4 h-4 text-[#A98B52]" />
          </button>
        </div>

        {savedProducts.length === 0 ? (
          <div className="bg-[#FCFBF8] rounded-2xl p-16 text-center border border-[#E5E0D5] space-y-5 max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#F7F3EA] text-[#A98B52] mx-auto flex items-center justify-center border border-[#E5E0D5]">
              <Heart className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#0D0E10]">Your wishlist is empty</h3>
            <p className="text-xs text-[#5A5D64] leading-relaxed">
              Save architectural sanitaryware, solar energy systems, and appliances while browsing our collection to review anytime.
            </p>
            <button
              onClick={() => navigate('shop')}
              className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold uppercase tracking-[0.14em] px-7 py-3.5 rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
            >
              Explore Collection
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
