import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import {
  supabase,
  isFrontendSupabaseConfigured,
  insertOrUpdateOrderInSupabase,
  insertOrUpdateProductInSupabase,
} from '../lib/supabaseClient';
import type { Order, DeliveryZone, DeliveryArea, DeliverySnapshot } from '../types';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Banknote,
  AlertCircle,
  MapPin,
  Clock,
  Wrench,
  Scale,
  Info,
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
    appliedCoupon,
    activeOfferSavings,
    customerAccount,
    clearCart,
    navigate,
    showToast,
    refreshProducts,
  } = useStore();

  const defaultAddr =
    (customerAccount?.savedAddresses || []).find((a) => a.isDefault) ||
    (customerAccount?.savedAddresses || [])[0];

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);

  const [formData, setFormData] = useState({
    fullName: defaultAddr?.fullName || customerAccount?.fullName || '',
    phone: defaultAddr?.phone || customerAccount?.phone || '',
    email: customerAccount?.email || '',
    country: 'Pakistan',
    province: defaultAddr?.province || 'Punjab',
    city: defaultAddr?.city || 'Lahore',
    areaId: defaultAddr?.areaId || '',
    areaName: defaultAddr?.areaName || '',
    addressLine: defaultAddr?.addressLine || '',
    postalCode: defaultAddr?.postalCode || '',
    landmark: defaultAddr?.landmark || '',
    customerNotes: '',
    requestInstallation: false,
  });

  const [deliverySnap, setDeliverySnap] = useState<DeliverySnapshot | null>(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load Delivery Zones & Areas from Supabase / Backend
  useEffect(() => {
    Promise.all([
      fetch('/api/delivery/zones', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => []),
      fetch('/api/delivery/areas', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([zList, aList]) => {
      if (Array.isArray(zList)) setZones(zList);
      if (Array.isArray(aList)) {
        setAreas(aList);
        const cityAreas = aList.filter(
          (a: DeliveryArea) => a.city.toLowerCase() === formData.city.toLowerCase()
        );
        if (cityAreas.length > 0 && !formData.areaId) {
          setFormData((prev) => ({
            ...prev,
            areaId: cityAreas[0].id,
            areaName: cityAreas[0].name,
          }));
        }
      }
    });
  }, []);

  // Live Authoritative Delivery Calculation whenever City, Area, Province, Cart, or Installation changes
  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    setCalculatingDelivery(true);

    fetch('/api/delivery/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: formData.city,
        province: formData.province,
        areaId: formData.areaId || undefined,
        areaName: formData.areaName || undefined,
        postalCode: formData.postalCode || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: cartSubtotal,
        requestInstallation: formData.requestInstallation,
      }),
    })
      .then((r) => r.json())
      .then((snap: DeliverySnapshot) => {
        if (!cancelled && snap && snap.zoneName) {
          setDeliverySnap(snap);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCalculatingDelivery(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    formData.city,
    formData.province,
    formData.areaId,
    formData.areaName,
    formData.requestInstallation,
    cart,
    cartSubtotal,
  ]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F7F3EA] px-4 py-20 text-center space-y-4 text-[#292B30]">
        <h2 className="font-luxury-serif text-2xl font-semibold text-[#0D0E10]">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-[#292B30]/70 text-sm">
          Please add pieces to your bag before proceeding to checkout.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold px-6 py-3 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors"
        >
          Return to Showroom
        </button>
      </div>
    );
  }

  const cityAreas = areas.filter(
    (a) => a.city.toLowerCase() === formData.city.toLowerCase()
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'city') {
      const matchingAreas = areas.filter(
        (a) => a.city.toLowerCase() === value.toLowerCase()
      );
      const firstArea = matchingAreas[0];
      setFormData((prev) => ({
        ...prev,
        city: value,
        province: firstArea?.province || prev.province,
        areaId: firstArea?.id || '',
        areaName: firstArea?.name || '',
      }));
      return;
    }
    if (name === 'areaId') {
      const chosen = areas.find((a) => a.id === value);
      setFormData((prev) => ({
        ...prev,
        areaId: value,
        areaName: chosen?.name || '',
      }));
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const couponDiscount = appliedCoupon?.discount || 0;
  const smartOfferDiscount = activeOfferSavings?.discount || 0;
  const totalDiscount = couponDiscount + smartOfferDiscount;
  const effectiveDeliveryFee = deliverySnap ? deliverySnap.finalDeliveryCharge : 250;
  const effectiveInstallationFee = deliverySnap?.installationCharge || 0;
  const finalPayableTotal = Math.max(
    0,
    cartSubtotal - totalDiscount + effectiveDeliveryFee + effectiveInstallationFee
  );

  const codBlocked = deliverySnap && !deliverySnap.codAvailable && !deliverySnap.quoteRequired;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.addressLine.trim()) {
      setErrorMsg(
        'Please complete all required fields (Full Name, Phone Number, Delivery Address).'
      );
      showToast('Please fill in required fields.', 'error');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg(
        'Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567).'
      );
      return;
    }

    if (codBlocked) {
      setErrorMsg(
        deliverySnap?.codBlockedReason ||
          'Cash on Delivery is currently unavailable for this area.'
      );
      showToast('COD unavailable for selected area', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customerId: customerAccount?.id || undefined,
        areaId: formData.areaId || undefined,
        areaName: formData.areaName || undefined,
        requestInstallation: formData.requestInstallation,
        customer: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || customerAccount?.email || undefined,
          addressLine: formData.addressLine.trim(),
          areaId: formData.areaId || undefined,
          areaName: formData.areaName || formData.city,
          zoneId: deliverySnap?.zoneId,
          zoneName: deliverySnap?.zoneName,
          city: formData.city,
          province: formData.province,
          country: 'Pakistan',
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

      let finalOrder: Order | null = null;
      let directError: string | undefined;

      // 1. Submit to backend API (authoritative calculation, stock validation & Supabase sync)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await safeJsonResponse(res, { error: 'Failed to place order.' });

      if (!res.ok && data?.error) {
        throw new Error(data.error);
      }

      if (res.ok && data && !data.error && data.id) {
        finalOrder = data as Order;
      }

      // 2. Ensure direct Supabase sync of the authoritative order snapshot
      if (isFrontendSupabaseConfigured && supabase && finalOrder) {
        const supaOrderRes = await insertOrUpdateOrderInSupabase(finalOrder);
        if (supaOrderRes.ok) {
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
        } else {
          directError = supaOrderRes.error;
        }
      }

      if (!finalOrder) {
        throw new Error(
          directError ||
            data?.error ||
            'Order could not be saved to Supabase. Please check connection.'
        );
      }

      clearCart();
      await refreshProducts();
      showToast(`Order ${finalOrder.orderNumber} placed successfully!`, 'success');
      navigate('order-success', { orderNumber: finalOrder.orderNumber });
    } catch (err: any) {
      setErrorMsg(
        err.message || 'An error occurred during order submission. Please try again.'
      );
      showToast(err.message || 'Order failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-10 sm:py-14 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Back Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#292B30]/75 hover:text-[#0D0E10] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A98B52]" />
            <span>Continue Shopping</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#292B30]/75 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#A98B52]" />
            <span>Private &amp; Verified COD Checkout</span>
          </div>
        </div>

        <form
          onSubmit={handlePlaceOrder}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Contact Information */}
            <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-3.5 border-b border-[#B8B9BC]/30">
                <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#C9B27C] text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10] uppercase tracking-wider">
                  Client &amp; Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-[#0D0E10]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Engr. Muhammad Tariq"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0D0E10]">
                    Phone Number (For Courier Verification){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0300 1234567"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0D0E10]">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="yourname@domain.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address, Zone & Area */}
            <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#B8B9BC]/30">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#C9B27C] text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10] uppercase tracking-wider">
                    Delivery Destination &amp; Area Selection
                  </h3>
                </div>
                {deliverySnap && (
                  <span className="text-[11px] font-mono font-bold text-[#A98B52]">
                    {deliverySnap.zoneName}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D0E10]">
                      Province / Region <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs cursor-pointer"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D0E10]">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs cursor-pointer"
                    >
                      {PAKISTAN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D0E10]">
                      Delivery Area / Sector <span className="text-rose-500">*</span>
                    </label>
                    {cityAreas.length > 0 ? (
                      <select
                        name="areaId"
                        value={formData.areaId}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs cursor-pointer font-semibold"
                      >
                        {cityAreas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                            {a.isRemoteArea ? ' (Remote Area)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="areaName"
                        value={formData.areaName}
                        onChange={handleChange}
                        placeholder={`Sector / Area in ${formData.city}`}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Live Zone/Area Calculation Banner */}
                {deliverySnap && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      deliverySnap.codAvailable
                        ? 'bg-[#151C2C] text-[#FCFBF8] border-[#C9B27C]/40'
                        : 'bg-rose-950 text-rose-100 border-rose-500/60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5 text-[#C9B27C]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {deliverySnap.areaName} → {deliverySnap.zoneName}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#B8B9BC]">
                        {deliverySnap.ruleApplied} · Est. {deliverySnap.estimatedDeliveryText}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      {deliverySnap.quoteRequired ? (
                        <span className="text-amber-300 font-bold">Quote Required</span>
                      ) : deliverySnap.freeDeliveryApplied &&
                        deliverySnap.finalDeliveryCharge === 0 ? (
                        <span className="text-emerald-400 font-bold">FREE DELIVERY</span>
                      ) : (
                        <span className="text-[#C9B27C] font-bold">
                          Rs. {deliverySnap.finalDeliveryCharge.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0D0E10]">
                    Full Delivery Address (House / Plot / Street / Sector){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="addressLine"
                    required
                    value={formData.addressLine}
                    onChange={handleChange}
                    placeholder="e.g. House 42, Street 5, DHA Phase 6, or Plot 18 Industrial Estate"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D0E10]">
                      Nearest Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="e.g. Near Main Boulevard"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0D0E10]">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 54000"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                    />
                  </div>
                </div>

                {/* Optional Professional Installation Toggle */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requestInstallation}
                    onChange={(e) =>
                      setFormData({ ...formData, requestInstallation: e.target.checked })
                    }
                    className="mt-0.5 accent-[#151C2C]"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-[#0D0E10] flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-[#A98B52]" />
                      <span>Request Certified M.A. Engineering Installation</span>
                    </div>
                    <p className="text-[11px] text-[#292B30]/75 mt-0.5">
                      Separate installation charges apply for eligible Solar, Hob, Hood, Electrical,
                      and EV equipment.
                    </p>
                  </div>
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0D0E10]">
                    Customer Delivery Instructions (Optional)
                  </label>
                  <textarea
                    name="customerNotes"
                    rows={2}
                    value={formData.customerNotes}
                    onChange={handleChange}
                    placeholder="e.g. Please call before delivery."
                    className="w-full px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 bg-[#F7F3EA] text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method: Cash on Delivery */}
            <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#C9B27C] shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3.5 border-b border-[#B8B9BC]/30">
                <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#C9B27C] text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10] uppercase tracking-wider">
                  Payment Method
                </h3>
              </div>

              {codBlocked ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      {deliverySnap?.codBlockedReason ||
                        'Cash on Delivery is currently unavailable for this area.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('b2b-wholesale')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#151C2C] text-[#C9B27C] font-semibold text-[11px] cursor-pointer"
                  >
                    Request Delivery / B2B Assistance
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/50 flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#151C2C] text-[#C9B27C] shrink-0 mt-0.5">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-[#0D0E10]">
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A98B52]">
                        Verified Eligible
                      </span>
                    </div>
                    <p className="text-xs text-[#292B30] leading-relaxed font-medium">
                      Pay in cash when your order is delivered to your doorstep in{' '}
                      {formData.areaName || formData.city}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Transparent Order Summary Card */}
          <div className="lg:col-span-5 bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-md space-y-5 sticky top-28">
            <h3 className="font-luxury-serif text-base font-semibold text-[#0D0E10] uppercase tracking-wider pb-3.5 border-b border-[#B8B9BC]/30">
              Order Summary ({cart.length} {cart.length === 1 ? 'piece' : 'pieces'})
            </h3>

            {/* Items summary */}
            <div className="max-h-64 overflow-y-auto space-y-3.5 pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3.5 text-xs items-center">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-13 h-13 rounded-lg object-cover border border-[#B8B9BC]/40 bg-[#F7F3EA] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#0D0E10] truncate">
                      {item.productName}
                    </div>
                    <div className="text-[#292B30]/70 text-[11px] font-mono">
                      Qty: {item.quantity} &times; Rs. {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-bold text-[#0D0E10] shrink-0 tabular-nums">
                    Rs. {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Transparent Price Breakdown */}
            <div className="pt-4 border-t border-[#B8B9BC]/35 space-y-2.5 text-xs text-[#292B30]/80">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#0D0E10] tabular-nums">
                  Rs. {cartSubtotal.toLocaleString()}
                </span>
              </div>

              {smartOfferDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Smart Offer ({activeOfferSavings?.offerName})</span>
                  <span>− Rs. {smartOfferDiscount.toLocaleString()}</span>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between text-[#A98B52] font-semibold">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>− Rs. {appliedCoupon.discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>
                  Delivery — {deliverySnap?.areaName || formData.areaName || formData.city}
                </span>
                <span className="font-semibold text-[#0D0E10] tabular-nums">
                  {calculatingDelivery ? (
                    'Calculating...'
                  ) : deliverySnap?.quoteRequired ? (
                    'Confirmed by Quote'
                  ) : deliverySnap?.freeDeliveryApplied &&
                    deliverySnap.baseDeliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `Rs. ${(deliverySnap?.baseDeliveryCharge ?? effectiveDeliveryFee).toLocaleString()}`
                  )}
                </span>
              </div>

              {deliverySnap && deliverySnap.remoteAreaSurcharge > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Remote Area Surcharge</span>
                  <span className="tabular-nums">
                    Rs. {deliverySnap.remoteAreaSurcharge.toLocaleString()}
                  </span>
                </div>
              )}

              {deliverySnap && deliverySnap.heavyOversizedSurcharge > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>
                    Heavy / Oversized Surcharge ({deliverySnap.totalWeightKg} kg)
                  </span>
                  <span className="tabular-nums">
                    Rs. {deliverySnap.heavyOversizedSurcharge.toLocaleString()}
                  </span>
                </div>
              )}

              {effectiveInstallationFee > 0 && (
                <div className="flex justify-between text-[#151C2C] font-semibold">
                  <span>Installation Charge</span>
                  <span className="tabular-nums">
                    Rs. {effectiveInstallationFee.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#0D0E10] pt-3 border-t border-[#B8B9BC]/35">
                <span>Total</span>
                <span className="text-[#151C2C] text-lg font-extrabold tabular-nums">
                  Rs. {finalPayableTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {deliverySnap?.quoteRequired && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px]">
                Delivery charges for this order will be confirmed by M.A. Group Of Companies.
              </div>
            )}

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={submitting || Boolean(codBlocked)}
              className="w-full bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs sm:text-sm py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.14em] transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Confirming Order...'
                  : codBlocked
                  ? 'COD Unavailable for Selected Area'
                  : 'Confirm Order'}
              </span>
            </button>

            <div className="space-y-2 text-[11px] text-[#292B30]/75 pt-3 border-t border-[#B8B9BC]/30">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#A98B52]" />
                <span>
                  Estimated delivery:{' '}
                  <strong>
                    {deliverySnap?.estimatedDeliveryText || '2–4 business days'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A98B52]" />
                <span>
                  Authoritative pricing verified by M.A. Group Of Companies logistics engine.
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
