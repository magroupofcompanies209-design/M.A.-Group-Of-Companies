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
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-[#9CA3AF]">
        Loading your order confirmation...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-black text-white">Order Confirmed</h1>
        <p className="text-sm text-[#9CA3AF]">
          Your order {orderNumber ? <strong className="text-blue-400 font-mono">#{orderNumber}</strong> : ''} has been placed via Cash on Delivery. You can track its live status anytime.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <button
            onClick={() => navigate('track-order')}
            className="bg-[#111318] border border-[#2B2F38] hover:border-blue-500/40 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate('shop')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D10] py-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Confirmation Banner */}
        <div className="bg-[#111318] rounded-3xl p-6 sm:p-8 border border-[#1A1D23] shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-extrabold uppercase tracking-wider">
              Cash on Delivery Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white pt-1">
              Thank You For Your Order!
            </h1>
            <p className="text-sm text-[#9CA3AF] max-w-md mx-auto">
              Your order has been registered with <strong className="text-white">M.A. GROUP OF COMPANIES</strong>. Our dispatch team will call you shortly to verify delivery.
            </p>
          </div>

          {/* Order Number Box */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-[#0B0D10] text-white px-6 py-4 rounded-2xl border border-[#1A1D23]">
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] block">
                Order Tracking Number
              </span>
              <span className="text-xl font-black text-blue-400 font-mono tracking-wider">
                {order.orderNumber}
              </span>
            </div>
            <div className="h-8 w-px bg-[#1A1D23] hidden sm:block"></div>
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] block">
                Amount Payable on Delivery
              </span>
              <span className="text-xl font-black text-emerald-400">
                Rs. {order.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-[#111318] rounded-2xl p-6 border border-[#1A1D23] shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1D23] pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-white">Order Summary &amp; Delivery Details</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
              Status: {order.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2 bg-[#0B0D10] p-4 rounded-xl border border-[#1A1D23]">
              <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>Shipping Destination</span>
              </div>
              <p className="font-bold text-[#E5E7EB]">{order.customer.fullName}</p>
              <p className="text-[#9CA3AF]">{order.customer.addressLine}</p>
              {order.customer.landmark && (
                <p className="text-[#6B7280]">Landmark: {order.customer.landmark}</p>
              )}
              <p className="font-semibold text-[#E5E7EB]">
                {order.customer.city}, {order.customer.province}
              </p>
              <p className="text-[#9CA3AF] flex items-center gap-1 pt-1">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{order.customer.phone}</span>
              </p>
            </div>

            <div className="space-y-2 bg-[#0B0D10] p-4 rounded-xl border border-[#1A1D23]">
              <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Payment &amp; Dispatch</span>
              </div>
              <p className="text-[#9CA3AF]">
                Payment Method: <strong className="text-white">Cash on Delivery (COD)</strong>
              </p>
              <p className="text-[#9CA3AF]">
                Payment Status: <span className="text-amber-400 font-bold">{order.paymentStatus}</span>
              </p>
              <p className="text-[#9CA3AF]">
                Estimated Delivery: <strong className="text-white">2–4 Working Days</strong>
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Official M.A. Group Warranty Included</span>
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Ordered Items ({order.items.length})
            </h3>
            <div className="divide-y divide-[#1A1D23] border border-[#1A1D23] rounded-xl overflow-hidden">
              {order.items.map((item, index) => (
                <div key={index} className="p-3.5 flex items-center gap-3 bg-[#0B0D10]">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-12 h-12 rounded-lg object-cover bg-[#111318] border border-[#1A1D23] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.productName}</h4>
                    <span className="text-[11px] text-[#9CA3AF]">
                      SKU: {item.sku} &middot; Qty: {item.quantity} &times; Rs. {item.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-black text-white">
                    Rs. {item.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-[#1A1D23] pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#9CA3AF]">
              <span>Subtotal</span>
              <span className="font-semibold text-white">Rs. {order.subtotal.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span className="font-bold">- Rs. {order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-[#9CA3AF]">
              <span>Delivery Charges</span>
              <span className="font-semibold text-white">
                {order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#1A1D23]">
              <span>Total Cash on Delivery</span>
              <span className="text-blue-400">Rs. {order.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('track-order')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#111318] border border-[#2B2F38] hover:border-blue-500/40 text-xs font-bold text-white cursor-pointer transition-colors"
          >
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Track Order Status</span>
          </button>

          <button
            onClick={() => navigate('shop')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
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
