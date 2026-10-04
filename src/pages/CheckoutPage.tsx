import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import {
  supabase,
  isFrontendSupabaseConfigured,
  insertOrUpdateOrderInSupabase,
  insertOrUpdateProductInSupabase,
} from '../lib/supabaseClient';
import type { Order } from '../types';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Banknote,
  AlertCircle,
} from 'lucide-react';

const PAKISTAN_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Gujranwala',
  'Sialkot',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Abbottabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
  'Larkana',
  'Sheikhupura',
  'Jhelum',
  'Gujrat',
  'Mardan',
  'Kasur',
  'Rahim Yar Khan',
  'Sahiwal',
  'Okara',
  'Wah Cantt',
  'Dera Ghazi Khan',
  'Mirpur (AJK)',
  'Muzaffarabad (AJK)',
  'Gilgit',
];

const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    cartShippingFee,
    cartGrandTotal,
    appliedCoupon,
    clearCart,
    navigate,
    showToast,
    refreshProducts,
  } = useStore();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressLine: '',
    city: 'Lahore',
    province: 'Punjab',
    postalCode: '',
    landmark: '',
    customerNotes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#0B0D10] px-4 py-20 text-center space-y-4 text-white">
        <h2 className="text-2xl font-bold text-white">Your cart is empty</h2>
        <p className="text-[#6B7280] text-sm">
          Please add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-6 py-3 rounded-xl text-xs cursor-pointer transition-colors shadow-lg shadow-blue-500/20"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.addressLine.trim()) {
      setErrorMsg('Please complete all required fields (Full Name, Phone Number, Street Address).');
      showToast('Please fill in required fields.', 'error');
      return;
    }

    // Phone format verification for Pakistan (+92 or 03XX)
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567).');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          addressLine: formData.addressLine.trim(),
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode.trim() || undefined,
          landmark: formData.landmark.trim() || undefined,
        },
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          variantId: item.variantId,
          variantName: item.variantName,
        })),
        couponCode: appliedCoupon?.code,
        customerNotes: formData.customerNotes.trim() || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await safeJsonResponse(res, { error: 'Failed to place order.' });

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to place order.');
      }

      // Also ensure direct Supabase order persistence if frontend client is configured
      if (isFrontendSupabaseConfigured && supabase && data && data.id) {
        await insertOrUpdateOrderInSupabase(data as Order);
        for (const item of cart) {
          if (item.product) {
            const nextStock = Math.max(0, (item.product.stock || 0) - item.quantity);
            await insertOrUpdateProductInSupabase({
              ...item.product,
              stock: nextStock,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Success
      clearCart();
      await refreshProducts();
      showToast(`Order ${data.orderNumber} placed successfully!`, 'success');
      navigate('order-success', { orderNumber: data.orderNumber });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during order submission. Please try again.');
      showToast(err.message || 'Order failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Back Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#3B82F6]" />
            <span>Continue Shopping</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#6B7280] font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Server-Side Checkout</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Contact Information */}
            <div className="bg-[#111318] rounded-2xl p-6 border border-[#2B3038] shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1D23]">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Customer &amp; Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Engr. Muhammad Tariq"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Mobile Phone Number (For Courier Call) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0300 1234567"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Email Address (For Invoice Copy)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="bg-[#111318] rounded-2xl p-6 border border-[#2B3038] shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1D23]">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Delivery Address in Pakistan
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Street Address / House / Plot # / Floor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="addressLine"
                    required
                    value={formData.addressLine}
                    onChange={handleChange}
                    placeholder="e.g. House 42, Street 5, Sector G-11/2, or Plot 18 Industrial Area"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#E5E7EB]">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs cursor-pointer"
                    >
                      {PAKISTAN_CITIES.map((c) => (
                        <option key={c} value={c} className="bg-[#111318] text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#E5E7EB]">
                      Province <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs cursor-pointer"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p} value={p} className="bg-[#111318] text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#E5E7EB]">
                      Nearest Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="e.g. Near Shell Pump / Main Roundabout"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#E5E7EB]">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 54000"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Special Delivery Notes / Timings
                  </label>
                  <textarea
                    name="customerNotes"
                    rows={2}
                    value={formData.customerNotes}
                    onChange={handleChange}
                    placeholder="e.g. Call before delivery, deliver after 2 PM."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#2B3038] bg-[#0B0D10] text-white focus:outline-none focus:border-[#2563EB] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method: Strictly Cash on Delivery */}
            <div className="bg-[#111318] rounded-2xl p-6 border-2 border-[#2563EB]/40 shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1A1D23]">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Payment Method
                </h3>
              </div>

              {/* Exact COD Box as specified */}
              <div className="p-4 rounded-xl bg-[#1A1D23] border border-[#2563EB]/30 flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-[#2563EB]/20 text-[#3B82F6] shrink-0 mt-0.5 border border-[#2563EB]/30">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      Payment Method: Cash on Delivery (COD)
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#E5E7EB] leading-relaxed font-medium">
                    &quot;Pay in cash when your order is delivered.&quot;
                  </p>
                  <div className="text-[11px] text-[#6B7280] pt-1">
                    No card or advance online payment required. Inspect parcel package upon arrival and hand over cash to the courier representative.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5 bg-[#111318] rounded-2xl p-6 border border-[#2B3038] shadow-xl space-y-5 sticky top-24">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider pb-3 border-b border-[#1A1D23]">
              Order Review ({cart.length} items)
            </h3>

            {/* Items summary */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3 text-xs items-center">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-12 h-12 rounded object-cover border border-[#2B3038] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {item.productName}
                    </div>
                    <div className="text-[#6B7280] text-[11px] font-mono">
                      Qty: {item.quantity} &times; Rs. {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-extrabold text-white shrink-0">
                    Rs. {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-[#1A1D23] space-y-2 text-xs text-[#6B7280]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-white">
                  Rs. {cartSubtotal.toLocaleString()}
                </span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-Rs. {appliedCoupon.discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping across Pakistan</span>
                <span className="font-semibold text-white">
                  {cartShippingFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE DELIVERY</span>
                  ) : (
                    `Rs. ${cartShippingFee.toLocaleString()}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-3 border-t border-[#1A1D23]">
                <span>Total Due on Delivery (COD)</span>
                <span className="text-[#3B82F6] text-lg font-black">
                  Rs. {cartGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>{submitting ? 'CONFIRMING ORDER...' : 'CONFIRM ORDER VIA COD'}</span>
            </button>

            <div className="space-y-1.5 text-[11px] text-[#6B7280] pt-2 border-t border-[#1A1D23]">
              <div className="flex items-center gap-1.5 text-[#E5E7EB] font-medium">
                <Truck className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Standard delivery: 2-4 business days across Pakistan.</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#E5E7EB] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Our representative may call for address confirmation.</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
