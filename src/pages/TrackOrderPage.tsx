import React, { useState } from 'react';
import { safeJsonResponse } from '../utils/api';
import { Order, OrderStatus } from '../types';
import {
  Truck,
  Search,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const STAGES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export const TrackOrderPage: React.FC = () => {
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumberInput.trim()) {
      setErrorMsg('Please enter your Order ID (e.g. MAG-9214)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrder(null);

    try {
      const url = `/api/orders/track/${encodeURIComponent(orderNumberInput.trim())}${
        phoneInput.trim() ? `?phone=${encodeURIComponent(phoneInput.trim())}` : ''
      }`;
      const res = await fetch(url);
      const data = await safeJsonResponse(res, { error: 'Order not found.' });

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Order not found.');
      }

      setOrder(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not locate order details.');
    } finally {
      setLoading(false);
    }
  };

  const getStageIndex = (status: OrderStatus) => {
    const idx = STAGES.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#3B82F6] uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 px-3.5 py-1 rounded-full">
            <Truck className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Pakistan Nationwide Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Track Your Shipment
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] max-w-md mx-auto">
            Enter your M.A. GROUP OF COMPANIES order number from your confirmation SMS or receipt.
          </p>
        </div>

        {/* Lookup Box */}
        <div className="bg-[#111318] rounded-2xl p-6 border border-[#2B3038] shadow-xl text-white">
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Order ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                placeholder="e.g. MAG-9214"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-white text-xs font-medium focus:outline-none focus:border-[#2563EB] uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0300 1234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-white text-xs font-medium focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? 'Searching...' : 'Track'}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Tracking Results */}
        {order && (
          <div className="bg-[#111318] rounded-2xl border border-[#2B3038] shadow-2xl p-6 sm:p-8 space-y-8 animate-in fade-in duration-300 text-white">
            {/* Top Order Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1A1D23]">
              <div>
                <div className="text-xs text-[#6B7280] font-semibold uppercase">Order Number</div>
                <div className="text-xl font-black text-white">{order.orderNumber}</div>
                <div className="text-xs text-[#6B7280] mt-0.5">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} &middot; Cash on Delivery
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs text-[#6B7280] font-semibold uppercase">Current Status</div>
                <span className="inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-[#3B82F6] border border-blue-500/30">
                  {order.status}
                </span>
                {order.trackingNumber && (
                  <div className="text-xs text-[#6B7280] mt-1 font-mono">
                    Tracking #: <strong className="text-white">{order.trackingNumber}</strong> ({order.courierName || 'TCS Express'})
                  </div>
                )}
              </div>
            </div>

            {/* Visual Multi-Stage Progress Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider">
                Shipment Progress
              </h3>

              {/* Step indicator bar */}
              <div className="relative">
                {/* Horizontal line */}
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-[#2B3038] -translate-y-1/2 z-0" />
                <div
                  className="hidden sm:block absolute top-1/2 left-0 h-1 bg-[#2563EB] -translate-y-1/2 z-0 transition-all duration-700"
                  style={{
                    width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
                  }}
                />

                <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 relative z-10">
                  {STAGES.map((stage, idx) => {
                    const isPassed = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div key={stage} className="flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isCurrent
                              ? 'bg-[#2563EB] text-white ring-4 ring-blue-500/30 shadow-md'
                              : isPassed
                              ? 'bg-[#1A1D23] border border-[#2563EB] text-[#3B82F6]'
                              : 'bg-[#0B0D10] border border-[#2B3038] text-[#6B7280]'
                          }`}
                        >
                          {isPassed ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div
                          className={`text-[11px] mt-2 font-semibold ${
                            isCurrent
                              ? 'text-[#3B82F6]'
                              : isPassed
                              ? 'text-white'
                              : 'text-[#6B7280]'
                          }`}
                        >
                          {stage}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Destination & Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0B0D10] border border-[#2B3038] text-xs">
              <div>
                <div className="font-bold text-white uppercase text-[11px] mb-1">
                  Recipient &amp; Delivery Destination:
                </div>
                <div className="text-white font-semibold">{order.customer.fullName}</div>
                <div className="text-[#6B7280]">{order.customer.addressLine}</div>
                <div className="text-[#6B7280]">
                  {order.customer.city}, {order.customer.province}
                </div>
                <div className="text-[#6B7280] mt-1 font-mono">Phone: {order.customer.phone}</div>
              </div>

              <div>
                <div className="font-bold text-white uppercase text-[11px] mb-1">
                  Payment Verification:
                </div>
                <div className="text-[#6B7280]">
                  Method: <strong className="text-white">Cash on Delivery (COD)</strong>
                </div>
                <div className="text-[#6B7280]">
                  Amount to Collect: <strong className="text-[#3B82F6]">Rs. {order.grandTotal.toLocaleString()}</strong>
                </div>
                <div className="text-[#6B7280]">
                  COD Status: <span className="font-semibold text-emerald-400">{order.paymentStatus}</span>
                </div>
              </div>
            </div>

            {/* Detailed Event Log */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#1A1D23]">
                <h4 className="text-xs font-bold text-[#E5E7EB] uppercase tracking-wider">
                  Timeline Events
                </h4>
                <div className="space-y-2 text-xs">
                  {order.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0B0D10] border border-[#2B3038]">
                      <Clock className="w-3.5 h-3.5 text-[#3B82F6] mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold text-white">
                          {event.status} &middot; <span className="text-[11px] text-[#6B7280] font-normal">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        {event.note && <div className="text-[#6B7280] mt-0.5">{event.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
