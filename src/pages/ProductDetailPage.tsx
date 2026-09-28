import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import {
  Star,
  ShieldCheck,
  Truck,
  Heart,
  ShoppingCart,
  Check,
  Share2,
  CheckCircle2,
  Banknote,
  Wrench,
  Clock,
  ArrowLeft,
  Sparkles,
  MessageSquare,
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
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'features' | 'reviews'>('specs');

  // Review Form state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900">Product Not Found</h2>
        <p className="text-neutral-500 text-xs">
          The requested product may have been relocated or updated in our catalog.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-neutral-900 text-amber-400 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const isSaved = wishlist.includes(product.id);
  const effectivePrice = product.salePrice || product.price;
  const hasDiscount = !!product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  // Related products
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return;

    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerName: reviewName,
          rating: reviewRating,
          title: 'Verified Customer Review',
          comment: reviewComment,
        }),
      });

      setReviewSubmitted(true);
      showToast('Thank you! Your verified review has been published.', 'success');
      setReviewName('');
      setReviewComment('');
    } catch {
      showToast('Error submitting review', 'error');
    }
  };

  const handleConsultAi = () => {
    setIsAiChatOpen(true);
    window.dispatchEvent(
      new CustomEvent('open-ai-prompt', {
        detail: { prompt: `Tell me more about the technical specs and sizing suitability of ${product.name} (SKU: ${product.sku}).` },
      })
    );
  };

  return (
    <div className="bg-neutral-50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        {/* Back Link */}
        <div>
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </button>
        </div>

        {/* Main Product View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src={product.images[selectedImageIdx] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-md shadow-sm">
                  Save {discountPercent}%
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
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-neutral-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* AI Advisor Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500 text-neutral-950">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    Need technical sizing or installation advice?
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    Ask our AI assistant about load calculations &amp; wiring.
                  </div>
                </div>
              </div>
              <button
                onClick={handleConsultAi}
                className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Ask Assistant
              </button>
            </div>
          </div>

          {/* Right Column: Product Details & Purchase Form */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Unboxed Metadata */}
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <span className="text-amber-700 font-bold">{product.brand}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{product.categoryName}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="font-mono text-neutral-400">SKU: {product.sku}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Stock */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <div className="flex text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <span className="font-bold">{product.rating}</span>
                  <span className="text-neutral-400">({product.reviewCount} reviews)</span>
                </div>

                <span className="text-neutral-300">|</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-semibold text-neutral-800">
                    {product.stock > 0 ? `In Stock (${product.stock} units available)` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-950">
                    Rs. {effectivePrice.toLocaleString()}
                  </div>
                  {hasDiscount && (
                    <div className="text-xs text-neutral-400 line-through">
                      Original Price: Rs. {product.price.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-md">
                    Cash on Delivery (COD)
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {product.shortDescription || product.description}
              </p>

              {/* Warranty & Guarantee Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>{product.warranty}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Pay cash at doorstep</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Nationwide Express delivery</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>2 to 4 business days</span>
                </div>
              </div>
            </div>

            {/* Actions: Quantity & Add to Cart */}
            <div className="pt-6 border-t border-neutral-200 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-neutral-300 rounded-xl bg-white p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-xs text-neutral-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => addToCart(product, quantity)}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>ADD TO CART (COD)</span>
                </button>

                {/* Wishlist Button */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSaved
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title="Save to Wishlist"
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-600' : ''}`} />
                </button>
              </div>

              {/* Direct Buy Now (Instant Checkout) */}
              <button
                onClick={() => {
                  addToCart(product, quantity);
                  navigate('checkout');
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                BUY NOW WITH CASH ON DELIVERY
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Specifications, Features & Reviews */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'bg-neutral-900 text-amber-400'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'features'
                  ? 'bg-neutral-900 text-amber-400'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Key Features
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-neutral-900 text-amber-400'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Customer Reviews ({product.reviewCount})
            </button>
          </div>

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Engineering &amp; Performance Specifications
              </h3>
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-neutral-200">
                  <tbody className="divide-y divide-neutral-200">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                        <td className="p-3 font-semibold text-neutral-700 w-1/3">{spec.key}</td>
                        <td className="p-3 text-neutral-900 font-medium">{spec.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-3 font-semibold text-neutral-700">Official Warranty</td>
                      <td className="p-3 text-neutral-900 font-medium">{product.warranty}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-neutral-700">Payment &amp; Terms</td>
                      <td className="p-3 text-neutral-900 font-medium">Cash on Delivery across Pakistan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Product Advantages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {product.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-neutral-800 font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                    Customer Feedback &amp; Verification
                  </h3>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Reviews from verified Pakistani trade and retail buyers.
                  </div>
                </div>
              </div>

              {/* Review Submission Form */}
              {reviewSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your review has been successfully submitted!</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4 text-xs">
                  <div className="font-bold text-neutral-900 uppercase tracking-wider">
                    Write a Verified Review
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-neutral-700">Your Name</label>
                      <input
                        type="text"
                        required
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="e.g. Engr. Asim Raza"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-neutral-700">Rating (1 to 5 Stars)</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
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
                    <label className="font-semibold text-neutral-700">Your Review</label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience regarding performance, build quality, and delivery speed..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
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
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
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
