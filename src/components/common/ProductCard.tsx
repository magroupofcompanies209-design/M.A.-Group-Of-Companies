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
    <div className="group relative bg-[#FCFBF8] rounded-xl border border-[#B8B9BC]/35 hover:border-[#C9B27C] transition-all duration-500 hover:shadow-[0_16px_40px_rgba(13,14,16,0.08)] flex flex-col overflow-hidden">
      {/* Top Media Area */}
      <div
        className="relative aspect-square overflow-hidden bg-[#F7F3EA] cursor-pointer"
        onClick={() => navigate('product', { id: product.id })}
      >
        <img
          src={
            product.images[0] ||
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'
          }
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Subtle Luxury Vignette on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Floating Quick Action: Wishlist */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer ${
            isSaved
              ? 'bg-[#A98B52] text-[#FCFBF8] shadow-md'
              : 'bg-[#FCFBF8]/90 hover:bg-[#0D0E10] text-[#292B30] hover:text-[#C9B27C] shadow-sm border border-[#B8B9BC]/40'
          }`}
          title={isSaved ? 'Remove from saved collection' : 'Save to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#FCFBF8]' : ''}`} />
        </button>

        {/* Brushed Gold Premium Badges */}
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-[#A98B52] text-[#FCFBF8] text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded shadow-sm">
            Privilege {discountPercent}% Off
          </div>
        )}

        {product.isBestSeller && !hasDiscount && (
          <div className="absolute top-3 left-3 bg-[#0D0E10] border border-[#C9B27C]/60 text-[#C9B27C] text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded shadow-sm">
            Signature Piece
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#292B30]/60 font-semibold mb-1.5">
            <span className="text-[#A98B52]">{product.brand}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="truncate">{product.categoryName}</span>
          </div>

          {/* Product Name */}
          <h3
            onClick={() => navigate('product', { id: product.id })}
            className="text-sm sm:text-[15px] font-semibold text-[#292B30] line-clamp-2 hover:text-[#A98B52] cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* Rating & Availability */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-[#292B30]/70">
            <div className="flex items-center text-[#A98B52]">
              <Star className="w-3.5 h-3.5 fill-[#C9B27C] text-[#A98B52]" />
            </div>
            <span className="font-semibold text-[#292B30] text-[11px]">{product.rating}</span>
            <span className="text-[#292B30]/50 text-[10px]">({product.reviewCount})</span>
            <span aria-hidden="true" className="text-[#B8B9BC]">&middot;</span>
            <span
              className={`text-[10px] font-semibold tracking-wide ${
                product.stock > 0 ? 'text-[#151C2C]' : 'text-rose-600'
              }`}
            >
              {product.stock > 0 ? 'COD Available' : 'Out of Stock'}
            </span>
          </div>
        </div>

        {/* Pricing & Primary Button (Midnight Navy -> Champagne Gold Hover) */}
        <div className="mt-5 pt-3.5 border-t border-[#B8B9BC]/30 flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-bold text-[#0D0E10] tabular-nums tracking-tight">
              Rs. {effectivePrice.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-[#292B30]/50 line-through tabular-nums">
                Rs. {product.price.toLocaleString()}
              </div>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={product.stock <= 0}
            className={`px-3.5 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              inCart
                ? 'bg-[#A98B52] text-[#FCFBF8]'
                : 'bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] shadow-xs'
            }`}
            title="Add to Bag (Cash on Delivery)"
          >
            {inCart ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="text-[11px] tracking-wide">In Bag</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="text-[11px] tracking-wide">Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
