import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
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

export const OrderSuccessPage: React.FC = () => {
  const { routeParams, navigate } = useStore();
  const orderNumber = routeParams.orderNumber;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) return;
    fetch(`/api/orders/track/${orderNumber}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setOrder(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        {/* Main Success Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
          {/* Top Banner */}
          <div className="bg-neutral-950 text-white p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto">
              Thank you for ordering with M.A. GROUP OF COMPANIES. Your order has been registered in our logistics queue.
            </p>
            <div className="inline-block bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-xl text-amber-400 font-mono font-bold text-sm tracking-widest mt-2">
              Order ID: {orderNumber}
            </div>
          </div>

          {/* COD Notice Box */}
          <div className="p-6 bg-amber-500/10 border-b border-amber-500/20 text-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
                COD
              </div>
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Payment Method: Cash on Delivery
                </div>
                <div className="text-xs text-neutral-700">
                  Please keep exact cash ready upon delivery to your doorstep.
                </div>
              </div>
            </div>

            {order && (
              <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-amber-200">
                <div className="text-[11px] text-neutral-500 uppercase font-semibold">
                  Amount Due
                </div>
                <div className="text-xl font-black text-neutral-950">
                  Rs. {order.grandTotal.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              Retrieving invoice details...
            </div>
          ) : order ? (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block mb-1 uppercase text-[11px]">
                    Delivery Address:
                  </span>
                  <div className="text-neutral-700 font-medium">{order.customer.fullName}</div>
                  <div className="text-neutral-600">{order.customer.addressLine}</div>
                  <div className="text-neutral-600">
                    {order.customer.city}, {order.customer.province}
                  </div>
                  <div className="text-neutral-500 mt-1">Phone: {order.customer.phone}</div>
                </div>

                <div>
                  <span className="font-bold text-neutral-900 block mb-1 uppercase text-[11px]">
                    Shipping &amp; Verification:
                  </span>
                  <div className="text-neutral-600">
                    Method: <strong className="text-neutral-900">TCS Express Priority (COD)</strong>
                  </div>
                  <div className="text-neutral-600">
                    Expected Delivery: <strong>2 - 4 Business Days</strong>
                  </div>
                  <div className="text-neutral-600">
                    Status: <span className="text-amber-700 font-bold">{order.status}</span>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Ordered Products
                </h3>
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price (PKR)</th>
                        <th className="p-3 text-right">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {order.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="p-3 font-medium text-neutral-900">{it.productName}</td>
                          <td className="p-3 text-center">{it.quantity}</td>
                          <td className="p-3 text-right">Rs. {it.price.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold">Rs. {it.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-neutral-50 font-semibold border-t border-neutral-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-neutral-600">
                          Subtotal
                        </td>
                        <td className="p-3 text-right">Rs. {order.subtotal.toLocaleString()}</td>
                      </tr>
                      {order.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="p-3 text-right text-emerald-700">
                            Discount
                          </td>
                          <td className="p-3 text-right text-emerald-700">
                            -Rs. {order.discount.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-neutral-600">
                          Shipping Fee
                        </td>
                        <td className="p-3 text-right">
                          {order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee.toLocaleString()}`}
                        </td>
                      </tr>
                      <tr className="text-sm font-black text-neutral-950 bg-neutral-100">
                        <td colSpan={3} className="p-3 text-right">
                          Grand Total (COD)
                        </td>
                        <td className="p-3 text-right text-amber-700 font-extrabold">
                          Rs. {order.grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-100 print:hidden">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('track-order')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track Shipment</span>
                  </button>

                  <button
                    onClick={() => navigate('home')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs transition-colors cursor-pointer"
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
    </div>
  );
};
