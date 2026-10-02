import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import type { ProductVariant } from '../types';
import {
  ShoppingCart,
  Heart,
  Star,
  ShieldCheck,
  Truck,
  Banknote,
  Clock,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const {
    routeParams,
    products,
    addToCart,
    wishlist,
    toggleWishlist,
    navigate,
    showToast,
    setIsAiChatOpen,
  } = useStore();

  const productId = routeParams.id;
  const product = products.find((p) => p.id === productId || p.slug === productId);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'features' | 'reviews'>('specs');

  // Review Form state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#0B0D10] px-4 py-20 text-center space-y-4 text-white">
        <h2 className="text-2xl font-bold text-white">Product Not Found</h2>
        <p className="text-[#6B7280] text-xs max-w-sm">
          The requested product may have been relocated or updated in our catalog.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-lg shadow-blue-500/20"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Active Variant Selection
  const activeVariant = product.variants?.find((v) => v.id === selectedVariantId) || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
  const effectivePrice = activeVariant ? (activeVariant.salePrice || activeVariant.price) : (product.salePrice || product.price);
  const basePrice = activeVariant ? activeVariant.price : product.price;
  const effectiveStock = activeVariant ? activeVariant.stock : product.stock;
  const effectiveSku = activeVariant ? activeVariant.sku : product.sku;
  const isOutOfStock = effectiveStock <= 0;

  const isSaved = wishlist.includes(product.id);
  const hasDiscount = (activeVariant?.salePrice && activeVariant.salePrice < activeVariant.price) ||
    (!activeVariant && !!product.salePrice && product.salePrice < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((basePrice - effectivePrice) / basePrice) * 100)
    : 0;

  // Filter Related Products from same category
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  const handleConsultAi = () => {
    setIsAiChatOpen(true);
    window.dispatchEvent(
      new CustomEvent('open-ai-prompt', {
        detail: {
          prompt: `I am looking at "${product.name}" (SKU: ${effectiveSku}, Price: Rs. ${effectivePrice.toLocaleString()}). Can you explain if this fits my household or commercial requirements and what cables/accessories are needed?`,
        },
      })
    );
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setReviewSubmitted(true);
    showToast('Your verified review was submitted for moderation.', 'success');
    setReviewComment('');
    setReviewName('');
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast('This item is currently out of stock.', 'error');
      return;
    }
    const itemToAdd = activeVariant
      ? {
          ...product,
          name: `${product.name} (${activeVariant.name})`,
          price: activeVariant.price,
          salePrice: activeVariant.salePrice,
          sku: activeVariant.sku,
          stock: activeVariant.stock,
        }
      : product;
    addToCart(itemToAdd, quantity);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      showToast('This item is currently out of stock.', 'error');
      return;
    }
    handleAddToCart();
    navigate('checkout');
  };

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-8 sm:py-12 border-b border-[#1A1D23]">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <button
            onClick={() => navigate('shop')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#3B82F6]" />
            <span>Back to Products</span>
          </button>
          <div className="font-mono text-[11px] text-[#6B7280]">
            SKU: <span className="text-white font-semibold">{effectiveSku}</span>
          </div>
        </div>

        {/* Main Product View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-[#111318] rounded-3xl p-6 sm:p-10 border border-[#2B3038] shadow-xl">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0B0D10] border border-[#2B3038]">
              <img
                src={product.images[selectedImageIdx] || product.images[0] || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-[#2563EB] text-white font-bold text-xs px-3 py-1 rounded-md shadow-md">
                  Save {discountPercent}%
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="px-4 py-2 rounded-xl bg-rose-900/90 text-rose-200 border border-rose-700 font-black text-sm uppercase tracking-wider">
                    Sold Out / Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-18 h-18 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-[#2563EB] ring-2 ring-[#2563EB]/30'
                        : 'border-[#2B3038] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* AI Advisor Card */}
            <div className="p-4 rounded-2xl bg-[#1A1D23] border border-[#2B3038] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Need technical sizing or installation advice?
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    Ask our AI assistant about load calculations &amp; wiring.
                  </div>
                </div>
              </div>
              <button
                onClick={handleConsultAi}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 shadow-md shadow-blue-500/20"
              >
                Ask Assistant
              </button>
            </div>
          </div>

          {/* Right Column: Product Details & Purchase Form */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Unboxed Metadata */}
              <div className="flex items-center gap-2 text-xs text-[#6B7280] font-medium">
                <span className="text-[#3B82F6] font-bold">{product.brand}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-[#E5E7EB]">{product.categoryName}</span>
                {product.unit && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span className="px-2 py-0.5 rounded bg-[#1A1D23] text-[#E5E7EB] border border-[#2B3038] text-[10px]">
                      Unit: {product.unit}
                    </span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Stock */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-[#E5E7EB]">
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-yellow-400" />
                  </div>
                  <span className="font-bold">{product.rating}</span>
                  <span className="text-[#6B7280]">({product.reviewCount} reviews)</span>
                </div>

                <span className="text-[#2B3038]">|</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !isOutOfStock ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className={`font-semibold ${!isOutOfStock ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {!isOutOfStock
                      ? `In Stock (${effectiveStock} ${product.unit ? `${product.unit}s` : 'units'} available)`
                      : 'Out of Stock (Unavailable)'}
                  </span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-[#0B0D10] border border-[#2B3038] flex items-center justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    Rs. {effectivePrice.toLocaleString()}
                  </div>
                  {hasDiscount && (
                    <div className="text-xs text-[#6B7280] line-through">
                      Original Price: Rs. {basePrice.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block bg-blue-500/10 border border-blue-500/30 text-[#3B82F6] text-[11px] font-bold px-3 py-1.5 rounded-lg">
                    Cash on Delivery (COD)
                  </span>
                </div>
              </div>

              {/* Product Variants (Section 4) */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-[#0B0D10] border border-[#2B3038]">
                  <label className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider block">
                    Available Variants / Options:
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {product.variants.map((v) => {
                      const isSelected = activeVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            if (v.image) {
                              const foundIdx = product.images.indexOf(v.image);
                              if (foundIdx !== -1) setSelectedImageIdx(foundIdx);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#2563EB] text-white border-[#3B82F6] shadow-sm'
                              : 'bg-[#111318] text-[#E5E7EB] border-[#2B3038] hover:border-[#3B82F6]'
                          }`}
                        >
                          <span>{v.name}</span>
                          <span className={isSelected ? 'text-blue-100' : 'text-[#6B7280]'}>
                            &middot; Rs. {(v.salePrice || v.price).toLocaleString()}
                          </span>
                          {v.stock <= 0 && (
                            <span className="text-[10px] text-rose-400 font-bold">(0)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-[#E5E7EB] leading-relaxed">
                {product.shortDescription || product.description}
              </p>

              {/* Warranty & Guarantee Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="flex items-center gap-2 text-[#E5E7EB] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                  <span>{product.warranty}</span>
                </div>
                <div className="flex items-center gap-2 text-[#E5E7EB] font-medium">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Pay cash at doorstep</span>
                </div>
                <div className="flex items-center gap-2 text-[#E5E7EB] font-medium">
                  <Truck className="w-4 h-4 text-[#3B82F6]" />
                  <span>Nationwide Express delivery</span>
                </div>
                <div className="flex items-center gap-2 text-[#E5E7EB] font-medium">
                  <Clock className="w-4 h-4 text-[#6B7280]" />
                  <span>2 to 4 business days</span>
                </div>
              </div>
            </div>

            {/* Actions: Quantity & Add to Cart */}
            <div className="pt-6 border-t border-[#2B3038] space-y-4">
              {isOutOfStock ? (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    This product is currently out of stock. Customers cannot place orders until new inventory arrives.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-[#2B3038] rounded-xl bg-[#0B0D10] p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg hover:bg-[#1A1D23] flex items-center justify-center font-bold text-white transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-xs text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                      className="w-8 h-8 rounded-lg hover:bg-[#1A1D23] flex items-center justify-center font-bold text-white transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#1A1D23] hover:bg-[#2B3038] border border-[#2B3038] hover:border-[#3B82F6] text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#3B82F6]" />
                    <span>ADD TO CART (COD)</span>
                  </button>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      isSaved
                        ? 'border-rose-500 bg-rose-950/50 text-rose-400'
                        : 'border-[#2B3038] bg-[#0B0D10] text-[#E5E7EB] hover:bg-[#1A1D23]'
                    }`}
                    title="Save to Wishlist"
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500' : ''}`} />
                  </button>
                </div>
              )}

              {/* Direct Buy Now (Instant Checkout) */}
              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {isOutOfStock ? 'OUT OF STOCK' : 'BUY NOW WITH CASH ON DELIVERY'}
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Specifications, Features & Reviews */}
        <div className="bg-[#111318] rounded-3xl p-6 sm:p-10 border border-[#2B3038] shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-[#2B3038] pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'specs'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'features'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              Key Features
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'reviews'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#6B7280] hover:text-white'
              }`}
            >
              Customer Reviews ({product.reviewCount})
            </button>
          </div>

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Engineering &amp; Performance Specifications
              </h3>
              <div className="border border-[#2B3038] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-[#2B3038]">
                  <tbody className="divide-y divide-[#2B3038]">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#0B0D10]' : 'bg-[#111318]'}>
                        <td className="p-3 font-semibold text-[#6B7280] w-1/3">{spec.key}</td>
                        <td className="p-3 text-white font-medium">{spec.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-3 font-semibold text-[#6B7280]">Official Warranty</td>
                      <td className="p-3 text-white font-medium">{product.warranty}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#6B7280]">Payment &amp; Terms</td>
                      <td className="p-3 text-white font-medium">Cash on Delivery across Pakistan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Product Advantages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {product.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0B0D10] border border-[#2B3038] flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span className="text-[#E5E7EB] font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2B3038]">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Customer Feedback &amp; Verification
                  </h3>
                  <div className="text-xs text-[#6B7280] mt-0.5">
                    Reviews from verified Pakistani trade and retail buyers.
                  </div>
                </div>
              </div>

              {/* Review Submission Form */}
              {reviewSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Your review has been successfully submitted!</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="p-5 rounded-2xl bg-[#0B0D10] border border-[#2B3038] space-y-4 text-xs">
                  <div className="font-bold text-white uppercase tracking-wider">
                    Write a Verified Review
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#E5E7EB]">Your Name</label>
                      <input
                        type="text"
                        required
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="e.g. Engr. Asim Raza"
                        className="w-full px-3 py-2 rounded-lg border border-[#2B3038] bg-[#111318] text-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[#E5E7EB]">Rating (1 to 5 Stars)</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-[#2B3038] bg-[#111318] text-white focus:outline-none focus:border-[#2563EB] cursor-pointer"
                      >
                        <option value={5}>5 Stars - Excellent Equipment</option>
                        <option value={4}>4 Stars - Very Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Below Expectation</option>
                        <option value={1}>1 Star - Poor</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#E5E7EB]">Your Review</label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience regarding performance, build quality, and delivery speed..."
                      className="w-full px-3 py-2 rounded-lg border border-[#2B3038] bg-[#111318] text-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Submit Review
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {related.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Related Equipment in {product.categoryName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
