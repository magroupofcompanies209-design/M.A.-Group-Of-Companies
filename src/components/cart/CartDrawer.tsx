import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Tag,
  Truck,
  ShoppingBag,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartShippingFee,
    cartGrandTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    settings,
    navigate,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  if (!isCartDrawerOpen) return null;

  const freeShippingThreshold = settings?.freeShippingThreshold || 5000;
  const neededForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const freeShippingPercent = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    await applyCoupon(couponInput.trim());
    setCouponLoading(false);
    setCouponInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Top Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Shopping Cart
                </h2>
                <div className="text-[11px] text-neutral-400">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'} &middot; Cash on Delivery
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs">
            {cartSubtotal >= freeShippingThreshold ? (
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>You unlocked FREE delivery across Pakistan!</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-neutral-600 mb-1.5 font-medium">
                  <span>
                    Add <strong className="text-neutral-900">Rs. {neededForFreeShipping.toLocaleString()}</strong> more for FREE shipping
                  </span>
                  <span>{freeShippingPercent}%</span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-neutral-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="text-base font-bold text-neutral-700">Your cart is empty</div>
                <p className="text-xs max-w-xs text-neutral-500">
                  Browse our certified solar systems, copper cables, sanitary ware, and hardware products.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('shop');
                  }}
                  className="mt-2 bg-neutral-900 hover:bg-neutral-800 text-amber-400 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3.5 pb-4 border-b border-neutral-100 items-start"
                >
                  <img
                    src={item.productImage || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80'}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-200 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">
                      {item.productName}
                    </h4>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      SKU: {item.sku}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-neutral-300 rounded-md bg-neutral-50">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-neutral-900">
                          Rs. {item.total.toLocaleString()}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-white space-y-4">
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>Coupon: {appliedCoupon.code} (-Rs. {appliedCoupon.discount.toLocaleString()})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon (e.g. WELCOMEPK)"
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-amber-500 uppercase"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Price Calculation Details */}
              <div className="space-y-1.5 text-xs text-neutral-600 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">
                    Rs. {cartSubtotal.toLocaleString()}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-Rs. {appliedCoupon.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {cartShippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `Rs. ${cartShippingFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-neutral-950 pt-2 border-t border-neutral-100">
                  <span>Grand Total (COD)</span>
                  <span className="text-amber-700 text-base">
                    Rs. {cartGrandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* COD Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Cash on Delivery (COD) Only:</strong> Pay in cash when the courier arrives at your doorstep.
                </span>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  navigate('checkout');
                }}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>PROCEED TO COD CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
