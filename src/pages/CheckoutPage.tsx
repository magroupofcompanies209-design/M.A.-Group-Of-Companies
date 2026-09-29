import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900">Your cart is empty</h2>
        <p className="text-neutral-500 text-sm">
          Please add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-neutral-900 text-amber-400 font-bold px-6 py-3 rounded-xl text-xs cursor-pointer"
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

      // Success
      clearCart();
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
    <div className="bg-neutral-50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Back Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Server-Side Checkout</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Contact Information */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-amber-400 text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
                  Customer &amp; Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Engr. Muhammad Tariq"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Mobile Phone Number (For Courier Call) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0300 1234567"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Email Address (For Invoice Copy)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-amber-400 text-xs font-extrabold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
                  Delivery Address in Pakistan
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Street Address / House / Plot # / Floor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="addressLine"
                    required
                    value={formData.addressLine}
                    onChange={handleChange}
                    placeholder="e.g. House 42, Street 5, Sector G-11/2, or Plot 18 Industrial Area"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900 bg-white"
                    >
                      {PAKISTAN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Province <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900 bg-white"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Nearest Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="e.g. Near Shell Pump / Main Roundabout"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 54000"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Special Delivery Notes / Timings
                  </label>
                  <textarea
                    name="customerNotes"
                    rows={2}
                    value={formData.customerNotes}
                    onChange={handleChange}
                    placeholder="e.g. Call before delivery, deliver after 2 PM."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 text-xs text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method: Strictly Cash on Delivery */}
            <div className="bg-white rounded-2xl p-6 border-2 border-amber-500/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-amber-400 text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
                  Payment Method
                </h3>
              </div>

              {/* Exact COD Box as specified */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-neutral-900 text-amber-400 shrink-0 mt-0.5">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-neutral-900">
                      Payment Method: Cash on Delivery (COD)
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    &quot;Pay in cash when your order is delivered.&quot;
                  </p>
                  <div className="text-[11px] text-neutral-500 pt-1">
                    No card or advance online payment required. Inspect parcel package upon arrival and hand over cash to the courier representative.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-neutral-200 shadow-md space-y-5 sticky top-24">
            <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-100">
              Order Review ({cart.length} items)
            </h3>

            {/* Items summary */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3 text-xs items-center">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-12 h-12 rounded object-cover border border-neutral-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-neutral-900 truncate">
                      {item.productName}
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Qty: {item.quantity} &times; Rs. {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-extrabold text-neutral-900 shrink-0">
                    Rs. {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-900">
                  Rs. {cartSubtotal.toLocaleString()}
                </span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-Rs. {appliedCoupon.discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping across Pakistan</span>
                <span className="font-semibold text-neutral-900">
                  {cartShippingFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE DELIVERY</span>
                  ) : (
                    `Rs. ${cartShippingFee.toLocaleString()}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-neutral-950 pt-3 border-t border-neutral-200">
                <span>Total Due on Delivery (COD)</span>
                <span className="text-amber-700 text-lg">
                  Rs. {cartGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-black text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <span>{submitting ? 'CONFIRMING ORDER...' : 'CONFIRM ORDER VIA COD'}</span>
            </button>

            <div className="space-y-1.5 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standard delivery: 2-4 business days across Pakistan.</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Our representative may call for address confirmation.</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
