import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Truck,
  Phone,
  MapPin,
  FileText,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import { fetchOrderByOrderNumberFromSupabase } from '../lib/supabaseClient';
import type { Order } from '../types';

export const OrderSuccessPage: React.FC = () => {
  const { routeParams, navigate } = useStore();
  const orderNumber = routeParams.orderNumber;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      try {
        const supaOrder = await fetchOrderByOrderNumberFromSupabase(orderNumber);
        if (supaOrder) {
          setOrder(supaOrder);
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/orders/track/${encodeURIComponent(orderNumber)}?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await safeJsonResponse<Order | null>(res, null);
        if (data && !(data as any).error) {
          setOrder(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="bg-[#F7F3EA] min-h-[60vh] flex items-center justify-center px-4 py-20 text-center text-[#5A5D64]">
        <div className="space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#151C2C] border-t-[#C9B27C] animate-spin mx-auto" />
          <p className="text-sm font-medium">Loading your order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#F7F3EA] min-h-[70vh] py-16 px-4">
        <div className="max-w-2xl mx-auto bg-[#FCFBF8] border border-[#E5E0D5] rounded-2xl p-10 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0D0E10]">Order Confirmed</h1>
          <p className="text-sm text-[#5A5D64] max-w-md mx-auto leading-relaxed">
            Your order {orderNumber ? <strong className="text-[#151C2C] font-mono">#{orderNumber}</strong> : ''} has been placed via Cash on Delivery. You can track its live status anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('track-order')}
              className="bg-[#F7F3EA] border border-[#E5E0D5] hover:border-[#C9B27C] text-[#151C2C] font-semibold text-xs uppercase tracking-[0.14em] px-6 py-3 rounded-lg cursor-pointer transition-colors"
            >
              Track Order
            </button>
            <button
              onClick={() => navigate('shop')}
              className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.14em] px-6 py-3 rounded-lg cursor-pointer transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F3EA] py-12 min-h-screen text-[#292B30]">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Confirmation Banner */}
        <div className="bg-[#FCFBF8] rounded-2xl p-8 sm:p-10 border border-[#E5E0D5] shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 rounded-full bg-[#C9B27C]/15 border border-[#C9B27C]/40 text-[#A98B52] text-[10px] font-bold uppercase tracking-[0.2em]">
              Cash on Delivery Confirmed
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0D0E10] pt-1">
              Thank You For Your Order
            </h1>
            <p className="text-sm text-[#5A5D64] max-w-md mx-auto leading-relaxed">
              Your order has been registered with <strong className="text-[#0D0E10]">M.A. GROUP OF COMPANIES</strong>. Our dispatch concierge will call you shortly to verify delivery.
            </p>
          </div>

          {/* Order Number Box */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-[#151C2C] text-[#FCFBF8] px-7 py-5 rounded-xl border border-[#C9B27C]/30 shadow-md">
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#B8B9BC] block">
                Order Tracking Number
              </span>
              <span className="text-xl font-bold text-[#C9B27C] font-mono tracking-wider">
                {order.orderNumber}
              </span>
            </div>
            <div className="h-9 w-px bg-[#C9B27C]/25 hidden sm:block"></div>
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#B8B9BC] block">
                Amount Payable on Delivery
              </span>
              <span className="font-serif text-xl font-bold text-[#FCFBF8]">
                PKR {order.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#E5E0D5] shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D5] pb-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#A98B52]" />
              <h2 className="font-serif text-xl font-bold text-[#0D0E10]">Order Summary &amp; Delivery Details</h2>
            </div>
            <span className="px-3.5 py-1 rounded-full bg-[#F7F3EA] text-[#151C2C] border border-[#E5E0D5] text-xs font-semibold">
              Status: <strong className="text-[#A98B52]">{order.status}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="space-y-2 bg-[#F7F3EA] p-5 rounded-xl border border-[#E5E0D5]">
              <div className="font-bold text-[#0D0E10] flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
                <MapPin className="w-4 h-4 text-[#A98B52]" />
                <span>Shipping Destination</span>
              </div>
              <p className="font-bold text-[#0D0E10] text-sm pt-1">{order.customer.fullName}</p>
              <p className="text-[#5A5D64] leading-relaxed">{order.customer.addressLine}</p>
              {order.customer.landmark && (
                <p className="text-[#7A7D85]">Landmark: {order.customer.landmark}</p>
              )}
              <p className="font-semibold text-[#292B30]">
                {order.customer.city}, {order.customer.province}
              </p>
              <p className="text-[#292B30] flex items-center gap-1.5 pt-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#A98B52]" />
                <span>{order.customer.phone}</span>
              </p>
            </div>

            <div className="space-y-2 bg-[#F7F3EA] p-5 rounded-xl border border-[#E5E0D5]">
              <div className="font-bold text-[#0D0E10] flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
                <Truck className="w-4 h-4 text-[#A98B52]" />
                <span>Payment &amp; Dispatch</span>
              </div>
              <p className="text-[#5A5D64] pt-1">
                Payment Method: <strong className="text-[#0D0E10]">Cash on Delivery (COD)</strong>
              </p>
              <p className="text-[#5A5D64]">
                Payment Status: <span className="text-[#A98B52] font-bold">{order.paymentStatus}</span>
              </p>
              <p className="text-[#5A5D64]">
                Estimated Delivery: <strong className="text-[#0D0E10]">2–4 Working Days</strong>
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Official M.A. Group Warranty Included</span>
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A7D85]">
              Ordered Items ({order.items.length})
            </h3>
            <div className="divide-y divide-[#E5E0D5] border border-[#E5E0D5] rounded-xl overflow-hidden bg-[#F7F3EA]/50">
              {order.items.map((item, index) => (
                <div key={index} className="p-4 flex items-center gap-3.5 bg-[#FCFBF8]">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-14 h-14 rounded-lg object-cover bg-[#F7F3EA] border border-[#E5E0D5] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[#0D0E10] truncate">{item.productName}</h4>
                    <span className="text-[11px] text-[#7A7D85] block mt-0.5">
                      SKU: {item.sku} &middot; Qty: {item.quantity} &times; PKR {item.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#0D0E10]">
                    PKR {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-[#E5E0D5] pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#5A5D64]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0D0E10]">PKR {order.subtotal.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span className="font-bold">- PKR {order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5A5D64]">
              <span>Delivery Charges</span>
              <span className="font-semibold text-[#0D0E10]">
                {order.shippingFee === 0 ? 'Complimentary' : `PKR ${order.shippingFee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#0D0E10] pt-3 border-t border-[#E5E0D5]">
              <span>Total Cash on Delivery</span>
              <span className="font-serif text-xl text-[#151C2C]">PKR {order.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('track-order')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#FCFBF8] border border-[#E5E0D5] hover:border-[#C9B27C] text-xs font-semibold uppercase tracking-[0.14em] text-[#151C2C] cursor-pointer transition-colors"
          >
            <Truck className="w-4 h-4 text-[#A98B52]" />
            <span>Track Order Status</span>
          </button>

          <button
            onClick={() => navigate('shop')}
            className="flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
