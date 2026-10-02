import React from 'react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { ShoppingCart, Heart, Star, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { navigate, addToCart, wishlist, toggleWishlist, cart } = useStore();

  const isSaved = wishlist.includes(product.id);
  const inCart = cart.some((item) => item.productId === product.id);
  const effectivePrice = product.salePrice || product.price;
  const hasDiscount = !!product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  return (
    <div className="group relative bg-[#111318] rounded-xl border border-[#2B3038] hover:border-[#2563EB] transition-all duration-300 hover:shadow-xl flex flex-col overflow-hidden">
      {/* Top Media Area */}
      <div className="relative aspect-square overflow-hidden bg-[#0B0D10] cursor-pointer" onClick={() => navigate('product', { id: product.id })}>
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Floating Quick Action: Wishlist */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors ${
            isSaved
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-[#1A1D23]/80 hover:bg-[#1A1D23] text-[#E5E7EB] hover:text-rose-400 shadow-sm border border-[#2B3038]'
          }`}
          title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
        </button>

        {/* Quiet Discount Flag if applicable */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 bg-[#2563EB] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            Save {discountPercent}%
          </div>
        )}

        {product.isBestSeller && !hasDiscount && (
          <div className="absolute top-2.5 left-2.5 bg-[#1A1D23] border border-[#2563EB]/40 text-[#3B82F6] text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            Best Seller
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-medium mb-1">
            <span className="text-[#3B82F6] font-semibold">{product.brand}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="truncate text-[#6B7280]">{product.categoryName}</span>
          </div>

          {/* Title */}
          <h3
            onClick={() => navigate('product', { id: product.id })}
            className="text-sm font-bold text-white line-clamp-2 hover:text-[#3B82F6] cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2 text-xs text-[#6B7280]">
            <div className="flex items-center text-[#3B82F6]">
              <Star className="w-3.5 h-3.5 fill-[#3B82F6]" />
            </div>
            <span className="font-semibold text-[#E5E7EB] text-[11px]">{product.rating}</span>
            <span className="text-[#6B7280] text-[10px]">({product.reviewCount})</span>
            <span aria-hidden="true" className="text-[#2B3038]">&middot;</span>
            <span className="text-[10px] text-emerald-400 font-medium">COD Available</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-[#2B3038] flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-white tabular-nums">
              Rs. {effectivePrice.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-[#6B7280] line-through tabular-nums">
                Rs. {product.price.toLocaleString()}
              </div>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            className={`p-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inCart
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md'
            }`}
            title="Add to Cart (Cash on Delivery)"
          >
            {inCart ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-[11px]">In Cart</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span className="text-[11px]">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
