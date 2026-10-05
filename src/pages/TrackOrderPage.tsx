import React, { useState, useEffect } from 'react';
import { safeJsonResponse } from '../utils/api';
import { fetchOrderByOrderNumberFromSupabase } from '../lib/supabaseClient';
import { Order, OrderStatus } from '../types';
import { useStore } from '../context/StoreContext';
import {
  Truck,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
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
  const { routeParams } = useStore();
  const [orderNumberInput, setOrderNumberInput] = useState(routeParams.orderNumber || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [quoteRecord, setQuoteRecord] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const lookupOrder = async (orderNum: string, phoneVal = '') => {
    if (!orderNum.trim()) {
      setErrorMsg('Please enter your Order ID (e.g. MAG-9214) or Quote Tracking Code (e.g. MA-QUOTE-2026-1001)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrder(null);
    setQuoteRecord(null);

    try {
      const cleanCode = orderNum.trim().toUpperCase();
      if (cleanCode.startsWith('MA-QUOTE') || cleanCode.startsWith('B2B-')) {
        const qRes = await fetch(`/api/quotations/track/${encodeURIComponent(cleanCode)}?_t=${Date.now()}`);
        const qData = await safeJsonResponse(qRes, null);
        if (qRes.ok && qData && qData.id) {
          setQuoteRecord(qData);
          setLoading(false);
          return;
        }
        throw new Error(qData?.error || 'Quotation not found with that Quote Tracking Code.');
      }

      const supaOrder = await fetchOrderByOrderNumberFromSupabase(orderNum.trim());
      if (supaOrder) {
        if (phoneVal.trim()) {
          const cleanQueryPhone = phoneVal.replace(/[^0-9]/g, '');
          const cleanOrderPhone = (supaOrder.customer?.phone || '').replace(/[^0-9]/g, '');
          if (
            cleanQueryPhone &&
            cleanOrderPhone &&
            !cleanOrderPhone.includes(cleanQueryPhone) &&
            !cleanQueryPhone.includes(cleanOrderPhone)
          ) {
            throw new Error('Phone number does not match order records.');
          }
        }
        setOrder(supaOrder);
        setLoading(false);
        return;
      }

      const url = `/api/orders/track/${encodeURIComponent(orderNum.trim())}${
        phoneVal.trim() ? `?phone=${encodeURIComponent(phoneVal.trim())}` : ''
      }`;
      const res = await fetch(url, { cache: 'no-store' });
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

  useEffect(() => {
    if (routeParams.orderNumber) {
      setOrderNumberInput(routeParams.orderNumber);
      lookupOrder(routeParams.orderNumber);
    }
  }, [routeParams.orderNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupOrder(orderNumberInput, phoneInput);
  };

  const getStageIndex = (status: OrderStatus) => {
    const idx = STAGES.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-14 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.2em] bg-[#FCFBF8] border border-[#E5E0D5] px-4 py-1.5 rounded-full">
            <Truck className="w-3.5 h-3.5 text-[#A98B52]" />
            <span>Pakistan Nationwide Dispatch</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0D0E10] tracking-tight">
            Track Your Shipment
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5D64] max-w-md mx-auto">
            Enter your M.A. GROUP OF COMPANIES order number from your confirmation receipt.
          </p>
        </div>

        {/* Lookup Box */}
        <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#E5E0D5] shadow-sm">
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] block mb-1.5">
                Order ID <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                placeholder="e.g. MAG-9214"
                className="w-full px-3.5 py-3 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-[#0D0E10] text-xs font-mono font-medium focus:outline-none focus:border-[#C9B27C] uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] block mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0300 1234567"
                className="w-full px-3.5 py-3 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-[#0D0E10] text-xs font-medium focus:outline-none focus:border-[#C9B27C]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.14em] py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{loading ? '...' : 'Track'}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Quote Tracking Result */}
        {quoteRecord && (
          <div className="bg-[#FCFBF8] rounded-2xl border border-[#C9B27C] shadow-sm p-6 sm:p-8 space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
              <div>
                <div className="text-[10px] text-[#A98B52] font-bold uppercase tracking-[0.18em]">
                  Permanent Quote Tracking Code
                </div>
                <div className="font-mono text-2xl font-bold text-[#0D0E10] mt-0.5">
                  {quoteRecord.quoteTrackingCode || quoteRecord.id}
                </div>
                <div className="text-xs text-[#5A5D64] mt-1">
                  Submitted on {new Date(quoteRecord.createdAt).toLocaleString()}
                </div>
              </div>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 self-start sm:self-center">
                Status: {quoteRecord.status}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-1">
                <div className="font-bold text-[#0D0E10] uppercase text-[11px]">Client Details</div>
                <div className="font-semibold text-[#0D0E10]">{quoteRecord.contactPerson}</div>
                <div className="text-[#5A5D64]">{quoteRecord.companyName}</div>
                <div className="text-[#5A5D64]">
                  {quoteRecord.phone} {quoteRecord.city ? `• ${quoteRecord.city}` : ''}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-1">
                <div className="font-bold text-[#0D0E10] uppercase text-[11px]">
                  Requested Solution / Scope
                </div>
                {quoteRecord.solutionType && (
                  <div className="text-[#A98B52] font-semibold">{quoteRecord.solutionType}</div>
                )}
                <div className="text-[#292B30]">{quoteRecord.productsRequired}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Results */}
        {order && (
          <div className="bg-[#FCFBF8] rounded-2xl border border-[#E5E0D5] shadow-sm p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
            {/* Top Order Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
              <div>
                <div className="text-[10px] text-[#7A7D85] font-semibold uppercase tracking-[0.16em]">Order Number</div>
                <div className="font-mono text-2xl font-bold text-[#0D0E10] mt-0.5">{order.orderNumber}</div>
                <div className="text-xs text-[#5A5D64] mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} &middot; Cash on Delivery
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-[10px] text-[#7A7D85] font-semibold uppercase tracking-[0.16em]">Current Status</div>
                <span className="inline-block mt-1 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/30">
                  {order.status}
                </span>
                {order.trackingNumber && (
                  <div className="text-xs text-[#5A5D64] mt-1.5 font-mono">
                    Tracking #: <strong className="text-[#0D0E10]">{order.trackingNumber}</strong> ({order.courierName || 'TCS Express'})
                  </div>
                )}
              </div>
            </div>

            {/* Visual Multi-Stage Progress Timeline */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-[#292B30] uppercase tracking-[0.16em]">
                Shipment Progress
              </h3>

              <div className="relative">
                <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#E5E0D5] -translate-y-1/2 z-0" />
                <div
                  className="hidden sm:block absolute top-1/2 left-0 h-0.5 bg-[#A98B52] -translate-y-1/2 z-0 transition-all duration-700"
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
                              ? 'bg-[#151C2C] text-[#C9B27C] ring-4 ring-[#C9B27C]/25 shadow-sm'
                              : isPassed
                              ? 'bg-[#A98B52] text-[#FCFBF8]'
                              : 'bg-[#F7F3EA] border border-[#E5E0D5] text-[#7A7D85]'
                          }`}
                        >
                          {isPassed ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div
                          className={`text-[11px] mt-2 font-semibold ${
                            isCurrent
                              ? 'text-[#0D0E10]'
                              : isPassed
                              ? 'text-[#292B30]'
                              : 'text-[#7A7D85]'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] text-xs">
              <div className="space-y-1">
                <div className="font-bold text-[#0D0E10] uppercase tracking-[0.12em] text-[11px] mb-1.5">
                  Recipient &amp; Delivery Destination
                </div>
                <div className="text-[#0D0E10] font-semibold text-sm">{order.customer.fullName}</div>
                <div className="text-[#5A5D64]">{order.customer.addressLine}</div>
                <div className="text-[#5A5D64]">
                  {order.customer.city}, {order.customer.province}
                </div>
                <div className="text-[#292B30] pt-1 font-mono">Phone: {order.customer.phone}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-[#0D0E10] uppercase tracking-[0.12em] text-[11px] mb-1.5">
                  Payment Verification
                </div>
                <div className="text-[#5A5D64]">
                  Method: <strong className="text-[#0D0E10]">Cash on Delivery (COD)</strong>
                </div>
                <div className="text-[#5A5D64]">
                  Amount to Collect: <strong className="text-[#151C2C]">PKR {order.grandTotal.toLocaleString()}</strong>
                </div>
                <div className="text-[#5A5D64]">
                  COD Status: <span className="font-semibold text-[#A98B52]">{order.paymentStatus}</span>
                </div>
              </div>
            </div>

            {/* Detailed Event Log */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#E5E0D5]">
                <h4 className="text-[11px] font-bold text-[#292B30] uppercase tracking-[0.16em]">
                  Timeline Events
                </h4>
                <div className="space-y-2 text-xs">
                  {order.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#F7F3EA] border border-[#E5E0D5]">
                      <Clock className="w-3.5 h-3.5 text-[#A98B52] mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-[#0D0E10]">
                          {event.status} &middot; <span className="text-[11px] text-[#7A7D85] font-normal">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        {event.note && <div className="text-[#5A5D64] mt-0.5">{event.note}</div>}
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
