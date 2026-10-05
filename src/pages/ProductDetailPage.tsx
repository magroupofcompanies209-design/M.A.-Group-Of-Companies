import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
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
    visibleProducts,
    addToCart,
    wishlist,
    toggleWishlist,
    navigate,
    showToast,
    setIsAiChatOpen,
  } = useStore();

  const productId = routeParams.id;
  const product = visibleProducts.find((p) => p.id === productId || p.slug === productId);

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F7F3EA] px-4 py-20 text-center space-y-4 text-[#292B30]">
        <h2 className="font-luxury-serif text-2xl font-semibold text-[#0D0E10]">
          Product Not Found
        </h2>
        <p className="text-[#292B30]/70 text-xs max-w-sm">
          The requested item may have been relocated or updated in our showroom catalog.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Active Variant Selection
  const activeVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ||
    (product.variants && product.variants.length > 0 ? product.variants[0] : null);
  const effectivePrice = activeVariant
    ? activeVariant.salePrice || activeVariant.price
    : product.salePrice || product.price;
  const basePrice = activeVariant ? activeVariant.price : product.price;
  const effectiveStock = activeVariant ? activeVariant.stock : product.stock;
  const effectiveSku = activeVariant ? activeVariant.sku : product.sku;
  const isOutOfStock = effectiveStock <= 0;

  const isSaved = wishlist.includes(product.id);
  const hasDiscount =
    (activeVariant?.salePrice && activeVariant.salePrice < activeVariant.price) ||
    (!activeVariant && !!product.salePrice && product.salePrice < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((basePrice - effectivePrice) / basePrice) * 100)
    : 0;

  // Filter Related Products from same category
  const related = visibleProducts
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
    <div className="bg-[#F7F3EA] text-[#292B30] py-10 sm:py-14 border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-[#292B30]/70">
          <button
            onClick={() => navigate('shop')}
            className="flex items-center gap-2 hover:text-[#0D0E10] font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A98B52]" />
            <span>Back to Showroom Catalog</span>
          </button>
          <div className="font-mono text-[11px] text-[#292B30]/70">
            SKU: <span className="text-[#0D0E10] font-semibold">{effectiveSku}</span>
          </div>
        </div>

        {/* Main Product View Card (Pearl White) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-[#FCFBF8] rounded-3xl p-6 sm:p-10 border border-[#B8B9BC]/40 shadow-sm">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F7F3EA] border border-[#B8B9BC]/35">
              <img
                src={
                  product.images[selectedImageIdx] ||
                  product.images[0] ||
                  'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'
                }
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-[#A98B52] text-[#FCFBF8] font-semibold text-xs uppercase tracking-wider px-3.5 py-1 rounded shadow-sm">
                  Privilege {discountPercent}% Off
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-[#0D0E10]/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="px-5 py-2.5 rounded-xl bg-[#0D0E10] text-[#C9B27C] border border-[#C9B27C]/50 font-semibold text-xs uppercase tracking-[0.18em]">
                    Currently Out of Stock
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
                        ? 'border-[#C9B27C] ring-2 ring-[#C9B27C]/30'
                        : 'border-[#B8B9BC]/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* M.A. SMART ASSISTANT Card */}
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#151C2C] text-[#C9B27C]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#0D0E10]">
                    M.A. SMART ASSISTANT
                  </div>
                  <div className="text-[11px] text-[#292B30]/70">
                    Ask about specifications, compatibility, warranty, or compare products.
                  </div>
                </div>
              </div>
              <button
                onClick={handleConsultAi}
                className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Ask M.A. SMART ASSISTANT
              </button>
            </div>
          </div>

          {/* Right Column: Product Details & Purchase Form */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Unboxed Metadata */}
              <div className="flex items-center gap-2 text-xs text-[#292B30]/70 font-semibold uppercase tracking-[0.14em]">
                <span className="text-[#A98B52]">{product.brand}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{product.categoryName}</span>
                {product.unit && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span className="px-2 py-0.5 rounded bg-[#F7F3EA] text-[#0D0E10] border border-[#B8B9BC]/40 text-[10px]">
                      Unit: {product.unit}
                    </span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Stock */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-[#0D0E10]">
                  <div className="flex text-[#C9B27C]">
                    <Star className="w-4 h-4 fill-[#C9B27C] text-[#A98B52]" />
                  </div>
                  <span className="font-bold">{product.rating}</span>
                  <span className="text-[#292B30]/60">({product.reviewCount} verified reviews)</span>
                </div>

                <span className="text-[#B8B9BC]">|</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !isOutOfStock ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      !isOutOfStock ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {!isOutOfStock
                      ? `In Stock (${effectiveStock} ${product.unit ? `${product.unit}s` : 'units'} available)`
                      : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-5 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/40 flex items-center justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#0D0E10] tabular-nums">
                    Rs. {effectivePrice.toLocaleString()}
                  </div>
                  {hasDiscount && (
                    <div className="text-xs text-[#292B30]/60 line-through tabular-nums mt-0.5">
                      Standard Price: Rs. {basePrice.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 text-[11px] font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-lg">
                    Cash on Delivery (COD)
                  </span>
                </div>
              </div>

              {/* Product Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/40">
                  <label className="text-xs font-semibold text-[#0D0E10] uppercase tracking-wider block">
                    Select Configuration / Option:
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
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#151C2C] text-[#FCFBF8] border-[#151C2C] shadow-xs'
                              : 'bg-[#FCFBF8] text-[#292B30] border-[#B8B9BC]/40 hover:border-[#C9B27C]'
                          }`}
                        >
                          <span>{v.name}</span>
                          <span className={isSelected ? 'text-[#C9B27C]' : 'text-[#292B30]/60'}>
                            &middot; Rs. {(v.salePrice || v.price).toLocaleString()}
                          </span>
                          {v.stock <= 0 && (
                            <span className="text-[10px] text-rose-500 font-bold">(0)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-[#292B30] leading-relaxed">
                {product.shortDescription || product.description}
              </p>

              {/* Warranty & Guarantee Highlights */}
              <div className="grid grid-cols-2 gap-3.5 text-xs pt-2">
                <div className="flex items-center gap-2 text-[#0D0E10] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#A98B52]" />
                  <span>{product.warranty}</span>
                </div>
                <div className="flex items-center gap-2 text-[#0D0E10] font-medium">
                  <Banknote className="w-4 h-4 text-[#A98B52]" />
                  <span>Pay cash upon delivery</span>
                </div>
                <div className="flex items-center gap-2 text-[#0D0E10] font-medium">
                  <Truck className="w-4 h-4 text-[#A98B52]" />
                  <span>Nationwide Express Dispatch</span>
                </div>
                <div className="flex items-center gap-2 text-[#0D0E10] font-medium">
                  <Clock className="w-4 h-4 text-[#A98B52]" />
                  <span>2 to 4 business days</span>
                </div>
              </div>
            </div>

            {/* Actions: Quantity & Add to Cart */}
            <div className="pt-6 border-t border-[#B8B9BC]/35 space-y-3.5">
              {isOutOfStock ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    This item is currently out of stock. Orders will reopen once new inventory is received.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center border border-[#B8B9BC]/50 rounded-xl bg-[#F7F3EA] p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg hover:bg-[#FCFBF8] flex items-center justify-center font-bold text-[#0D0E10] transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-xs text-[#0D0E10]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                      className="w-9 h-9 rounded-lg hover:bg-[#FCFBF8] flex items-center justify-center font-bold text-[#0D0E10] transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs sm:text-sm py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isSaved
                        ? 'border-[#A98B52] bg-[#A98B52] text-[#FCFBF8]'
                        : 'border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#292B30] hover:border-[#C9B27C]'
                    }`}
                    title="Save to Wishlist"
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? 'fill-[#FCFBF8]' : ''}`} />
                  </button>
                </div>
              )}

              {/* Direct Buy Now (Instant Checkout) */}
              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full bg-[#C9B27C] hover:bg-[#A98B52] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D0E10] font-semibold text-xs sm:text-sm py-3.5 rounded-xl uppercase tracking-[0.14em] transition-all shadow-sm cursor-pointer"
              >
                {isOutOfStock ? 'Out of Stock' : 'Buy Now with Cash on Delivery'}
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Specifications, Features & Reviews */}
        <div className="bg-[#FCFBF8] rounded-3xl p-6 sm:p-10 border border-[#B8B9BC]/40 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-[#B8B9BC]/35 pb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'specs'
                  ? 'bg-[#151C2C] text-[#FCFBF8]'
                  : 'text-[#292B30]/70 hover:text-[#0D0E10]'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'features'
                  ? 'bg-[#151C2C] text-[#FCFBF8]'
                  : 'text-[#292B30]/70 hover:text-[#0D0E10]'
              }`}
            >
              Engineering Highlights
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === 'reviews'
                  ? 'bg-[#151C2C] text-[#FCFBF8]'
                  : 'text-[#292B30]/70 hover:text-[#0D0E10]'
              }`}
            >
              Client Reviews ({product.reviewCount})
            </button>
          </div>

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                Engineering &amp; Performance Specifications
              </h3>
              <div className="border border-[#B8B9BC]/40 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-[#B8B9BC]/30">
                  <tbody className="divide-y divide-[#B8B9BC]/30">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#F7F3EA]' : 'bg-[#FCFBF8]'}>
                        <td className="p-3.5 font-semibold text-[#292B30]/80 w-1/3">{spec.key}</td>
                        <td className="p-3.5 text-[#0D0E10] font-medium">{spec.value}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#F7F3EA]">
                      <td className="p-3.5 font-semibold text-[#292B30]/80">Official Warranty</td>
                      <td className="p-3.5 text-[#0D0E10] font-medium">{product.warranty}</td>
                    </tr>
                    <tr className="bg-[#FCFBF8]">
                      <td className="p-3.5 font-semibold text-[#292B30]/80">Payment &amp; Terms</td>
                      <td className="p-3.5 text-[#0D0E10] font-medium">
                        Cash on Delivery across Pakistan
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                Key Product Advantages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {product.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/35 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#A98B52] shrink-0 mt-0.5" />
                    <span className="text-[#0D0E10] font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#B8B9BC]/30">
                <div>
                  <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                    Client Feedback &amp; Verification
                  </h3>
                  <div className="text-xs text-[#292B30]/70 mt-0.5">
                    Reviews from verified Pakistani residential and commercial buyers.
                  </div>
                </div>
              </div>

              {reviewSubmitted ? (
                <div className="p-4 rounded-xl bg-[#F7F3EA] border border-[#C9B27C] text-[#0D0E10] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#A98B52]" />
                  <span>Your review has been submitted. Thank you!</span>
                </div>
              ) : (
                <form
                  onSubmit={handleReviewSubmit}
                  className="p-6 rounded-2xl bg-[#F7F3EA] border border-[#B8B9BC]/40 space-y-4 text-xs"
                >
                  <div className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
                    Write a Verified Review
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#292B30]">Your Name</label>
                      <input
                        type="text"
                        required
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="e.g. Engr. Asim Raza"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#FCFBF8] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[#292B30]">Rating</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#FCFBF8] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] cursor-pointer"
                      >
                        <option value={5}>5 Stars - Exceptional Quality</option>
                        <option value={4}>4 Stars - Very Good</option>
                        <option value={3}>3 Stars - Satisfactory</option>
                        <option value={2}>2 Stars - Below Expectation</option>
                        <option value={1}>1 Star - Poor</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#292B30]">Your Review</label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience regarding build quality, performance, and delivery..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#FCFBF8] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold px-6 py-2.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
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
            <h2 className="font-luxury-serif text-2xl sm:text-3xl font-semibold text-[#0D0E10] tracking-tight">
              Complementary Pieces in {product.categoryName}
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
