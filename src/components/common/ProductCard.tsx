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
    <div className="group relative bg-white rounded-xl border border-neutral-200/80 hover:border-amber-400/80 transition-all duration-300 hover:shadow-lg flex flex-col overflow-hidden">
      {/* Top Media Area */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100 cursor-pointer" onClick={() => navigate('product', { id: product.id })}>
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
              ? 'bg-rose-50 text-rose-600 shadow-sm'
              : 'bg-white/80 hover:bg-white text-neutral-600 hover:text-rose-600 shadow-sm'
          }`}
          title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Quiet Discount Flag if applicable */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            Save {discountPercent}%
          </div>
        )}

        {product.isBestSeller && !hasDiscount && (
          <div className="absolute top-2.5 left-2.5 bg-neutral-900 text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            Best Seller
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium mb-1">
            <span className="text-amber-700 font-semibold">{product.brand}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="truncate">{product.categoryName}</span>
          </div>

          {/* Title */}
          <h3
            onClick={() => navigate('product', { id: product.id })}
            className="text-sm font-bold text-neutral-900 line-clamp-2 hover:text-amber-600 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2 text-xs text-neutral-600">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <span className="font-semibold text-neutral-800 text-[11px]">{product.rating}</span>
            <span className="text-neutral-400 text-[10px]">({product.reviewCount})</span>
            <span aria-hidden="true" className="text-neutral-300">&middot;</span>
            <span className="text-[10px] text-emerald-700 font-medium">COD Available</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-neutral-950">
              Rs. {effectivePrice.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-neutral-400 line-through">
                Rs. {product.price.toLocaleString()}
              </div>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            className={`p-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inCart
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-400'
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
