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
  const freeShippingPercent = Math.min(
    100,
    Math.round((cartSubtotal / freeShippingThreshold) * 100)
  );

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
        className="absolute inset-0 bg-[#0D0E10]/70 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FCFBF8] border-l border-[#B8B9BC]/40 shadow-2xl flex flex-col justify-between text-[#292B30]">
          {/* Top Header */}
          <div className="p-5 border-b border-[#B8B9BC]/25 flex items-center justify-between bg-[#0D0E10] text-[#FCFBF8]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#C9B27C]" />
              <div>
                <h2 className="font-luxury-serif text-base font-semibold uppercase tracking-[0.14em] text-[#FCFBF8]">
                  Your Selection
                </h2>
                <div className="text-[11px] text-[#B8B9BC]">
                  {cart.length} {cart.length === 1 ? 'piece' : 'pieces'} &middot; Cash on Delivery
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-[#B8B9BC] hover:text-[#C9B27C] hover:bg-[#151C2C] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-5 py-3.5 bg-[#F7F3EA] border-b border-[#B8B9BC]/35 text-xs">
            {cartSubtotal >= freeShippingThreshold ? (
              <div className="flex items-center gap-2 text-[#151C2C] font-semibold">
                <Truck className="w-4 h-4 text-[#A98B52]" />
                <span>Complimentary Nationwide Delivery Unlocked</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-[#292B30] mb-1.5 font-medium">
                  <span>
                    Add{' '}
                    <strong className="text-[#0D0E10]">
                      Rs. {neededForFreeShipping.toLocaleString()}
                    </strong>{' '}
                    more for complimentary delivery
                  </span>
                  <span className="text-[#A98B52] font-bold">{freeShippingPercent}%</span>
                </div>
                <div className="w-full bg-[#B8B9BC]/35 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#A98B52] h-full rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#292B30]/70 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#F7F3EA] border border-[#B8B9BC]/40 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-[#A98B52]" />
                </div>
                <div className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                  Your Shopping Bag is Empty
                </div>
                <p className="text-xs max-w-xs text-[#292B30]/70">
                  Explore our curated solar energy systems, architectural sanitary fittings, kitchen hobs, and hardware.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('shop');
                  }}
                  className="mt-2 bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3.5 pb-4 border-b border-[#B8B9BC]/30 items-start"
                >
                  <img
                    src={
                      item.productImage ||
                      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80'
                    }
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded-lg border border-[#B8B9BC]/40 bg-[#F7F3EA] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[#0D0E10] line-clamp-2 leading-snug">
                      {item.productName}
                    </h4>
                    <div className="text-[11px] text-[#292B30]/60 mt-0.5 font-mono">
                      SKU: {item.sku}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-[#B8B9BC]/50 rounded-md bg-[#F7F3EA]">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-[#FCFBF8] text-[#292B30] hover:text-[#0D0E10] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-[#0D0E10]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-[#FCFBF8] text-[#292B30] hover:text-[#0D0E10] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#0D0E10] tabular-nums">
                          Rs. {item.total.toLocaleString()}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-[#292B30]/50 hover:text-rose-600 transition-colors cursor-pointer"
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
            <div className="p-5 border-t border-[#B8B9BC]/35 bg-[#F7F3EA] space-y-4">
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FCFBF8] border border-[#C9B27C] text-xs">
                  <div className="flex items-center gap-2 text-[#0D0E10] font-semibold">
                    <Tag className="w-4 h-4 text-[#A98B52]" />
                    <span>
                      Privilege Code: {appliedCoupon.code} (-Rs.{' '}
                      {appliedCoupon.discount.toLocaleString()})
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
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
                    placeholder="Enter Privilege Code (e.g. WELCOMEPK)"
                    className="flex-1 px-3 py-2 text-xs bg-[#FCFBF8] border border-[#B8B9BC]/50 text-[#0D0E10] rounded-lg focus:outline-none focus:border-[#C9B27C] uppercase"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Price Calculation Details */}
              <div className="space-y-1.5 text-xs text-[#292B30]/80 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0D0E10] tabular-nums">
                    Rs. {cartSubtotal.toLocaleString()}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-[#A98B52] font-semibold">
                    <span>Privilege Discount ({appliedCoupon.code})</span>
                    <span>-Rs. {appliedCoupon.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-[#0D0E10]">
                    {cartShippingFee === 0 ? (
                      <span className="text-[#A98B52] font-bold">COMPLIMENTARY</span>
                    ) : (
                      `Rs. ${cartShippingFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold text-[#0D0E10] pt-2.5 border-t border-[#B8B9BC]/35">
                  <span>Total Due on Delivery (COD)</span>
                  <span className="text-[#151C2C] text-base tabular-nums">
                    Rs. {cartGrandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* COD Notice */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#FCFBF8] border border-[#C9B27C]/50 text-[11px] text-[#292B30]">
                <ShieldCheck className="w-4 h-4 text-[#A98B52] shrink-0" />
                <span>
                  <strong className="text-[#0D0E10]">Cash on Delivery (COD):</strong> Pay in cash when your order arrives at your doorstep.
                </span>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  navigate('checkout');
                }}
                className="w-full bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.14em] transition-all duration-300 shadow-md cursor-pointer"
              >
                <span>Proceed to COD Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
