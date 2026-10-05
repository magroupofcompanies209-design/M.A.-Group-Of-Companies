import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Tag,
  CheckCircle2,
  X,
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartShippingFee,
    cartGrandTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    navigate,
    settings,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const freeThreshold = settings?.freeShippingThreshold || 5000;
  const remainingForFreeShipping = Math.max(0, freeThreshold - cartSubtotal);
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeThreshold) * 100));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponInput.trim());
    setApplyingCoupon(false);
    setCouponInput('');
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#F7F3EA] text-[#292B30] min-h-[75vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-lg w-full bg-[#FCFBF8] border border-[#B8B9BC]/40 rounded-2xl p-10 sm:p-14 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em]">
              M.A. Group Showroom
            </span>
            <h1 className="font-luxury-serif text-2xl sm:text-3xl font-semibold text-[#0D0E10]">
              Your Shopping Cart is Empty
            </h1>
            <p className="text-xs sm:text-sm text-[#292B30]/70 leading-relaxed">
              Explore our certified Tier-1 solar equipment, architectural sanitary fittings, pure copper electrical solutions, and built-in kitchen appliances.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('shop')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold px-7 py-3.5 rounded-xl text-xs uppercase tracking-[0.15em] transition-all cursor-pointer"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('deals')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F7F3EA] hover:bg-[#C9B27C]/20 text-[#0D0E10] border border-[#B8B9BC]/40 font-semibold px-6 py-3.5 rounded-xl text-xs uppercase tracking-[0.15em] transition-all cursor-pointer"
            >
              <span>View Exclusive Deals</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-10 sm:py-14 min-h-screen border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Top Breadcrumb & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#B8B9BC]/35">
          <div>
            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A98B52] hover:text-[#0D0E10] uppercase tracking-[0.16em] mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </button>
            <h1 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight">
              Shopping Cart
            </h1>
            <p className="text-xs text-[#292B30]/70 mt-1">
              Review your selected items, adjust quantities, and proceed to nationwide Cash on Delivery checkout.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#292B30]/75 bg-[#FCFBF8] px-3.5 py-2 rounded-lg border border-[#B8B9BC]/40">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} Items in Cart
            </span>
            <button
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="bg-[#FCFBF8] rounded-xl p-4 sm:p-5 border border-[#B8B9BC]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              {remainingForFreeShipping === 0 ? (
                <p className="text-xs sm:text-sm font-semibold text-[#0D0E10]">
                  Congratulations! Your order qualifies for{' '}
                  <span className="text-[#A98B52] uppercase tracking-wider">Free Nationwide Delivery</span>.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-[#292B30]">
                  Add{' '}
                  <span className="font-bold text-[#0D0E10]">
                    PKR {remainingForFreeShipping.toLocaleString()}
                  </span>{' '}
                  more to unlock <span className="font-semibold text-[#A98B52]">FREE Delivery</span> across Pakistan.
                </p>
              )}
              <div className="w-full sm:w-80 h-1.5 bg-[#F7F3EA] rounded-full overflow-hidden mt-2 border border-[#B8B9BC]/30">
                <div
                  className="h-full bg-[#C9B27C] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#151C2C] bg-[#F7F3EA] px-3.5 py-2 rounded-lg border border-[#C9B27C]/40 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-[#A98B52]" />
            <span>100% Cash on Delivery Available</span>
          </div>
        </div>

        {/* Main Full-Screen Cart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Cols: Cart Items Table / Cards */}
          <div className="lg:col-span-8 space-y-4">
            {/* Desktop Column Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#0D0E10] text-[#FCFBF8] rounded-xl text-[11px] font-semibold uppercase tracking-[0.16em]">
              <div className="col-span-6">Product Details</div>
              <div className="col-span-2 text-center">Unit Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3.5">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'default'}`}
                  className="bg-[#FCFBF8] rounded-2xl p-4 sm:p-6 border border-[#B8B9BC]/40 hover:border-[#C9B27C] transition-all shadow-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Product Image + Name + SKU */}
                    <div className="md:col-span-6 flex items-center gap-4">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        onClick={() => navigate('product', { id: item.productId })}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-[#B8B9BC]/35 bg-white shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[#A98B52]">
                          SKU: {item.sku}
                        </div>
                        <h3
                          onClick={() => navigate('product', { id: item.productId })}
                          className="font-luxury-serif text-sm sm:text-base font-semibold text-[#0D0E10] hover:text-[#A98B52] cursor-pointer transition-colors line-clamp-2"
                        >
                          {item.productName}
                        </h3>
                        {item.variantName && (
                          <p className="text-[11px] text-[#292B30]/70">
                            Specification: <span className="font-semibold">{item.variantName}</span>
                          </p>
                        )}
                        <div className="pt-1 flex items-center gap-3">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2 flex md:flex-col items-center justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-[#B8B9BC]/25">
                      <span className="text-xs text-[#292B30]/60 md:hidden">Unit Price:</span>
                      <span className="text-xs sm:text-sm font-semibold text-[#292B30] tabular-nums">
                        PKR {item.price.toLocaleString()}
                      </span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                      <span className="text-xs text-[#292B30]/60 md:hidden">Quantity:</span>
                      <div className="inline-flex items-center rounded-xl border border-[#B8B9BC]/50 bg-[#F7F3EA] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-2 text-[#0D0E10] hover:bg-[#C9B27C] transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3.5 py-1 text-xs font-bold text-[#0D0E10] tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-2 text-[#0D0E10] hover:bg-[#C9B27C] transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Row Total Price */}
                    <div className="md:col-span-2 flex md:flex-col items-center justify-between md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-[#B8B9BC]/25">
                      <span className="text-xs text-[#292B30]/60 md:hidden">Item Total:</span>
                      <span className="text-sm sm:text-base font-bold text-[#0D0E10] tabular-nums">
                        PKR {item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                onClick={() => navigate('shop')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FCFBF8] hover:bg-[#151C2C] text-[#0D0E10] hover:text-[#FCFBF8] border border-[#B8B9BC]/50 text-xs font-semibold uppercase tracking-[0.14em] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>

          {/* Right 4 Cols: Order Summary & Checkout CTA */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-7 border border-[#B8B9BC]/45 shadow-sm space-y-6">
              <div className="pb-4 border-b border-[#B8B9BC]/30">
                <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                  M.A. Group Checkout
                </span>
                <h2 className="font-luxury-serif text-xl font-semibold text-[#0D0E10] mt-0.5">
                  Order Summary
                </h2>
              </div>

              {/* Promo / Coupon Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[#292B30]/75 uppercase tracking-[0.14em] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#A98B52]" />
                  <span>Promotional Code</span>
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-[#F7F3EA] px-3.5 py-2.5 rounded-xl border border-[#C9B27C]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#0D0E10]">{appliedCoupon.code}</p>
                        <p className="text-[10px] text-[#292B30]/70">
                          Saved PKR {appliedCoupon.discount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="p-1 text-[#292B30]/60 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. MAGROUP5)"
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/45 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] uppercase font-mono"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {applyingCoupon ? '...' : 'Apply'}
                    </button>
                  </form>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-3 text-xs sm:text-sm pt-2 border-t border-[#B8B9BC]/30">
                <div className="flex items-center justify-between text-[#292B30]/80">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0D0E10] tabular-nums">
                    PKR {cartSubtotal.toLocaleString()}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium">
                    <span>Promo Discount ({appliedCoupon.code})</span>
                    <span className="tabular-nums">- PKR {appliedCoupon.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[#292B30]/80">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-[#0D0E10] tabular-nums">
                    {cartShippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `PKR ${cartShippingFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="pt-4 border-t border-[#B8B9BC]/40 flex items-baseline justify-between">
                  <div>
                    <span className="font-luxury-serif text-base font-semibold text-[#0D0E10]">
                      Grand Total
                    </span>
                    <p className="text-[10px] text-[#292B30]/60">Inclusive of all applicable taxes</p>
                  </div>
                  <span className="font-luxury-serif text-xl sm:text-2xl font-bold text-[#0D0E10] tabular-nums">
                    PKR {cartGrandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Proceed to Checkout CTA */}
              <button
                onClick={() => navigate('checkout')}
                className="w-full py-4 px-6 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.18em] flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-[#B8B9BC]/25 space-y-2 text-[11px] text-[#292B30]/75">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#A98B52] shrink-0" />
                  <span>Pay Cash on Delivery upon physical verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#A98B52] shrink-0" />
                  <span>Insured dispatch to all cities across Pakistan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
