import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import { Order } from '../types';
import {
  CheckCircle2,
  Printer,
  Truck,
  ArrowRight,
  ShieldCheck,
  Building2,
  Phone,
} from 'lucide-react';
import { PrintReceiptModal } from '../components/common/PrintReceiptModal';

export const OrderSuccessPage: React.FC = () => {
  const { routeParams, navigate } = useStore();
  const orderNumber = routeParams.orderNumber;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    fetch(`/api/orders/track/${orderNumber}`)
      .then((r) => safeJsonResponse(r, null))
      .then((data) => {
        if (data && !data.error) setOrder(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const handlePrint = () => {
    if (order) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-12 min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        {/* Main Success Card */}
        <div className="bg-[#111318] rounded-2xl border border-[#2B3038] shadow-2xl overflow-hidden print:shadow-none print:border-none">
          {/* Top Banner */}
          <div className="bg-[#0B0D10] text-white p-6 sm:p-8 text-center space-y-3 border-b border-[#1A1D23]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-[#E5E7EB] max-w-md mx-auto">
              Thank you for ordering with M.A. GROUP OF COMPANIES. Your order has been registered in our logistics queue.
            </p>
            <div className="inline-block bg-[#111318] border border-[#2B3038] px-4 py-2 rounded-xl text-[#3B82F6] font-mono font-bold text-sm tracking-widest mt-2">
              Order ID: {orderNumber}
            </div>
          </div>

          {/* COD Notice Box */}
          <div className="p-6 bg-[#1A1D23] border-b border-[#2B3038] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                COD
              </div>
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
                  Payment Method: Cash on Delivery
                </div>
                <div className="text-xs text-[#E5E7EB]">
                  Please keep exact cash ready upon delivery to your doorstep.
                </div>
              </div>
            </div>

            {order && (
              <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-[#2B3038]">
                <div className="text-[11px] text-[#6B7280] uppercase font-semibold">
                  Amount Due
                </div>
                <div className="text-xl font-black text-[#3B82F6]">
                  Rs. {order.grandTotal.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          {loading ? (
            <div className="p-8 text-center text-xs text-[#6B7280]">
              Retrieving invoice details...
            </div>
          ) : order ? (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0B0D10] border border-[#2B3038] text-xs">
                <div>
                  <span className="font-bold text-white block mb-1 uppercase text-[11px]">
                    Delivery Address:
                  </span>
                  <div className="text-[#E5E7EB] font-medium">{order.customer.fullName}</div>
                  <div className="text-[#6B7280]">{order.customer.addressLine}</div>
                  <div className="text-[#6B7280]">
                    {order.customer.city}, {order.customer.province}
                  </div>
                  <div className="text-[#6B7280] mt-1 font-mono">Phone: {order.customer.phone}</div>
                </div>

                <div>
                  <span className="font-bold text-white block mb-1 uppercase text-[11px]">
                    Shipping &amp; Verification:
                  </span>
                  <div className="text-[#6B7280]">
                    Method: <strong className="text-white">TCS Express Priority (COD)</strong>
                  </div>
                  <div className="text-[#6B7280]">
                    Expected Delivery: <strong className="text-white">2 - 4 Business Days</strong>
                  </div>
                  <div className="text-[#6B7280]">
                    Status: <span className="text-[#3B82F6] font-bold uppercase">{order.status}</span>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ordered Products
                </h3>
                <div className="border border-[#2B3038] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B0D10] text-[#E5E7EB] font-bold border-b border-[#2B3038]">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price (PKR)</th>
                        <th className="p-3 text-right">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2B3038]">
                      {order.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1D23]/50">
                          <td className="p-3 font-medium text-white">{it.productName}</td>
                          <td className="p-3 text-center text-[#E5E7EB]">{it.quantity}</td>
                          <td className="p-3 text-right text-[#6B7280]">Rs. {it.price.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-white">Rs. {it.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#0B0D10] font-semibold border-t border-[#2B3038]">
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-[#6B7280]">
                          Subtotal
                        </td>
                        <td className="p-3 text-right text-white">Rs. {order.subtotal.toLocaleString()}</td>
                      </tr>
                      {order.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="p-3 text-right text-emerald-400">
                            Discount
                          </td>
                          <td className="p-3 text-right text-emerald-400">
                            -Rs. {order.discount.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-[#6B7280]">
                          Shipping Fee
                        </td>
                        <td className="p-3 text-right text-white">
                          {order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee.toLocaleString()}`}
                        </td>
                      </tr>
                      <tr className="text-sm font-black text-white bg-[#1A1D23]">
                        <td colSpan={3} className="p-3 text-right">
                          Grand Total (COD)
                        </td>
                        <td className="p-3 text-right text-[#3B82F6] font-extrabold">
                          Rs. {order.grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#2B3038] print:hidden">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2B3038] text-white hover:bg-[#1A1D23] font-bold text-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#3B82F6]" />
                  <span>Print Receipt</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('track-order')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white font-bold text-xs border border-[#2B3038] transition-colors cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-[#3B82F6]" />
                    <span>Track Shipment</span>
                  </button>

                  <button
                    onClick={() => navigate('home')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    <span>Back to Home</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showPrintModal && order && (
        <PrintReceiptModal
          order={order}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
