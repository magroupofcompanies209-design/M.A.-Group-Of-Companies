import React, { useState } from 'react';
import type { Order } from '../../types/index.ts';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export type ReceiptFormat = 'a4' | '80mm' | '58mm';

interface PrintReceiptModalProps {
  order: Order;
  onClose: () => void;
  initialFormat?: ReceiptFormat;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  order,
  onClose,
  initialFormat = 'a4',
}) => {
  const { settings } = useStore();
  const [format, setFormat] = useState<ReceiptFormat>(initialFormat);

  const storeName = settings?.storeName || 'M.A. GROUP OF COMPANIES';
  const tagline = settings?.tagline || 'PREMIUM ELECTRICAL, SOLAR & HARDWARE EQUIPMENT';
  const logoUrl = settings?.receiptLogoUrl || '';
  const phoneDisplay = settings?.contactPhone || '+92 300 1234567';
  const emailDisplay = settings?.contactEmail || 'support@magroup.pk';
  const addressDisplay = settings?.headOfficeAddress || 'Main Ferozepur Road / Showroom Hub, Lahore, Pakistan';
  const footerNote = settings?.receiptFooterNote || 'THANK YOU FOR CHOOSING M.A. GROUP OF COMPANIES';

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container - on screen shows dark preview modal, during window.print() only .print-friendly prints */}
      <div className="bg-[#111318] border border-[#1A1D23] rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* On-screen Controls Bar (Excluded during printing via .no-print) */}
        <div className="no-print p-4 border-b border-[#1A1D23] bg-[#0B0D10] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Receipt &amp; Invoice Print Engine</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-semibold">
                  {order.orderNumber}
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Authoritative Cash on Delivery receipt for standard &amp; POS thermal printers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector Pills */}
            <div className="flex items-center bg-[#111318] border border-[#1A1D23] rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  format === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                A4 Invoice
              </button>
              <button
                type="button"
                onClick={() => setFormat('80mm')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  format === '80mm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                80mm POS
              </button>
              <button
                type="button"
                onClick={() => setFormat('58mm')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  format === '58mm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                58mm POS
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#6B7280] hover:text-white hover:bg-[#1A1D23] transition-colors cursor-pointer"
              title="Close Print Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0B0D10]/80 flex justify-center">
          {/* ==============================================================
              A4 STANDARD INVOICE TEMPLATE
              ============================================================== */}
          {format === 'a4' && (
            <div className="print-friendly receipt-a4 bg-white text-black p-8 rounded-lg shadow-lg border border-neutral-200">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div className="flex items-start gap-4">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={storeName}
                      className="max-h-16 max-w-[140px] object-contain shrink-0"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase">{storeName}</h1>
                    <p className="text-xs font-semibold text-neutral-700 tracking-wider uppercase">
                      {tagline}
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Head Office: {addressDisplay}
                    </p>
                    <p className="text-xs text-neutral-600">
                      Helpline: {phoneDisplay} | {emailDisplay}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-black text-white font-mono font-bold text-xs uppercase mb-1">
                    OFFICIAL TAX INVOICE
                  </div>
                  <div className="text-base font-bold font-mono">#{order.orderNumber}</div>
                  <div className="text-xs text-neutral-600">Date: {formattedDate} {formattedTime}</div>
                  <div className="text-xs font-bold text-black mt-1">PAYMENT: CASH ON DELIVERY</div>
                </div>
              </div>

              {/* Customer & Shipping Details */}
              <div className="grid grid-cols-2 gap-6 p-4 border border-neutral-300 rounded mb-6 bg-neutral-50/50">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Billed & Shipped To:</div>
                  <div className="font-bold text-sm text-black">{order.customer.fullName}</div>
                  <div className="text-xs text-neutral-800 font-mono mt-0.5">Phone: {order.customer.phone}</div>
                  {order.customer.email && (
                    <div className="text-xs text-neutral-800">Email: {order.customer.email}</div>
                  )}
                  <div className="text-xs text-neutral-800 mt-1">{order.customer.addressLine}</div>
                  <div className="text-xs font-semibold text-neutral-900">{order.customer.city}, {order.customer.province || 'Pakistan'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Delivery Logistics:</div>
                  <div className="text-xs text-neutral-800">
                    <span className="font-semibold">Payment Terms:</span> Cash On Delivery (COD)
                  </div>
                  <div className="text-xs text-neutral-800 mt-0.5">
                    <span className="font-semibold">Courier / Dispatch:</span> {order.courierName || 'Standard Express Delivery'}
                  </div>
                  {order.trackingNumber && (
                    <div className="text-xs font-mono font-bold text-neutral-900 mt-0.5">
                      Tracking ID: {order.trackingNumber}
                    </div>
                  )}
                  {order.customerNotes && (
                    <div className="text-xs italic text-neutral-700 mt-2 p-1.5 bg-neutral-100 rounded border border-neutral-200">
                      Customer Note: &ldquo;{order.customerNotes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-neutral-300 mb-6">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300 font-bold uppercase text-neutral-700">
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Item Description / SKU</th>
                    <th className="p-2.5 text-center w-16">Qty</th>
                    <th className="p-2.5 text-right w-28">Unit Price</th>
                    <th className="p-2.5 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="receipt-row">
                      <td className="p-2.5 text-center font-mono text-neutral-500">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-black">{item.productName}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          SKU: {item.sku || 'MAG-PROD'} {item.variantName ? `| ${item.variantName}` : ''}
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-black">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">Rs. {item.price.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-black">Rs. {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Financial Summary */}
              <div className="flex justify-end mb-8">
                <div className="w-72 border border-neutral-300 rounded p-3 bg-neutral-50/50 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-700">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {order.subtotal.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-neutral-900 font-medium">
                      <span>Discount ({order.couponCode || 'Coupon'}):</span>
                      <span className="font-mono">- Rs. {order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-700">
                    <span>Delivery Charges:</span>
                    <span className="font-mono">
                      {order.shippingFee === 0 ? 'FREE' : `Rs. ${order.shippingFee.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-black text-sm font-black text-black">
                    <span>Grand Total:</span>
                    <span className="font-mono">Rs. {order.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 text-[11px] font-bold text-center uppercase tracking-wider text-black bg-neutral-200 p-1 rounded">
                    Collect Rs. {order.grandTotal.toLocaleString()} Cash Upon Delivery
                  </div>
                </div>
              </div>

              {/* Footer / Warranty Terms */}
              <div className="border-t border-neutral-300 pt-4 text-[10px] text-neutral-600 space-y-1">
                <div className="font-bold text-black uppercase">Warranty & Return Terms:</div>
                <p>1. Please inspect packages and verify sealed condition prior to making cash payment to courier.</p>
                <p>2. Solar panels and inverters include official manufacturer linear warranty backed by M.A. Group of Companies.</p>
                <p>3. Electrical cables and switches are certified pure copper standards. For claim queries contact helpline.</p>
                <div className="text-center pt-4 font-mono font-bold text-xs text-neutral-500">
                  *** {footerNote.toUpperCase()} ***
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              80MM POS THERMAL RECEIPT TEMPLATE (Standard Counter Roll)
              ============================================================== */}
          {format === '80mm' && (
            <div className="print-friendly receipt-80mm bg-white text-black p-4 rounded shadow-lg border border-neutral-300 text-xs">
              <div className="text-center mb-2">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="max-h-12 max-w-[120px] object-contain mx-auto mb-1.5"
                  />
                )}
                <div className="font-black text-base uppercase tracking-tight">{storeName}</div>
                <div className="text-[10px] uppercase font-bold tracking-wider">{tagline}</div>
                <div className="text-[10px]">{addressDisplay}</div>
                <div className="text-[10px]">Ph: {phoneDisplay}</div>
              </div>

              <div className="print-divider-double"></div>

              <div className="space-y-0.5 my-2">
                <div className="flex justify-between font-bold">
                  <span>ORDER #{order.orderNumber}</span>
                  <span>COD RECEIPT</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>DATE: {formattedDate}</span>
                  <span>{formattedTime}</span>
                </div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Customer */}
              <div className="my-2 space-y-0.5 text-[11px]">
                <div><span className="font-bold">CUSTOMER:</span> {order.customer.fullName}</div>
                <div><span className="font-bold">PHONE:</span> {order.customer.phone}</div>
                <div><span className="font-bold">DESTINATION:</span> {order.customer.city}</div>
                <div className="text-[10px] leading-tight text-neutral-800">{order.customer.addressLine}</div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Line Items Header */}
              <div className="grid grid-cols-12 font-bold text-[11px] pb-1 border-b border-black">
                <div className="col-span-6">ITEM</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-4 text-right">TOTAL</div>
              </div>

              {/* Line Items */}
              <div className="divide-y divide-dashed divide-neutral-300 my-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="receipt-row py-1 text-[11px]">
                    <div className="font-bold leading-tight">{item.productName}</div>
                    <div className="grid grid-cols-12 text-[10px] text-neutral-700">
                      <div className="col-span-6">{item.sku}</div>
                      <div className="col-span-2 text-center font-bold">{item.quantity}x</div>
                      <div className="col-span-4 text-right font-bold text-black font-mono">
                        Rs.{item.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="print-divider-double"></div>

              {/* Totals */}
              <div className="space-y-1 font-mono text-[11px] my-2">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>Rs.{order.subtotal.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>DISCOUNT:</span>
                    <span>-Rs.{order.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>DELIVERY FEE:</span>
                  <span>{order.shippingFee === 0 ? 'FREE' : `Rs.${order.shippingFee.toLocaleString()}`}</span>
                </div>
                <div className="print-divider-dashed"></div>
                <div className="flex justify-between font-black text-sm pt-1">
                  <span>TOTAL COD:</span>
                  <span>Rs.{order.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Courier Instructions */}
              <div className="text-center my-2 border border-black p-1.5 font-bold uppercase text-[10px]">
                COLLECT CASH: RS. {order.grandTotal.toLocaleString()}
              </div>

              <div className="text-center text-[9px] space-y-0.5 mt-3 text-neutral-600">
                <div>Genuine Products Verified Guarantee</div>
                <div>Keep receipt for warranty claims</div>
                <div className="font-bold font-mono mt-1">*** THANK YOU ***</div>
              </div>
            </div>
          )}

          {/* ==============================================================
              58MM POS THERMAL RECEIPT TEMPLATE (Compact Mini Roll)
              ============================================================== */}
          {format === '58mm' && (
            <div className="print-friendly receipt-58mm bg-white text-black p-2.5 rounded shadow-lg border border-neutral-300 text-[10px] leading-tight font-mono">
              <div className="text-center mb-1.5 font-sans">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="max-h-10 max-w-[90px] object-contain mx-auto mb-1"
                  />
                )}
                <div className="font-black text-xs uppercase tracking-tight">{storeName}</div>
                <div className="text-[8px] uppercase font-bold">{tagline}</div>
                <div className="text-[8px]">Ph: {phoneDisplay}</div>
              </div>

              <div className="print-divider-double"></div>

              <div className="my-1 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>ORD: {order.orderNumber}</span>
                  <span>COD</span>
                </div>
                <div className="text-[8px] text-neutral-600">{formattedDate} {formattedTime}</div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Customer */}
              <div className="my-1 text-[9px] leading-tight">
                <div className="font-bold truncate">{order.customer.fullName}</div>
                <div>{order.customer.phone}</div>
                <div className="font-bold">{order.customer.city}</div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Items */}
              <div className="space-y-1.5 my-1 text-[9px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="receipt-row leading-tight">
                    <div className="font-bold truncate">{item.productName}</div>
                    <div className="flex justify-between text-[8.5px]">
                      <span>{item.quantity} x Rs.{item.price.toLocaleString()}</span>
                      <span className="font-bold">Rs.{item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="print-divider-double"></div>

              {/* Totals */}
              <div className="space-y-0.5 text-[9px] my-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>Rs.{order.subtotal.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span>DISC:</span>
                    <span>-Rs.{order.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>SHIP:</span>
                  <span>{order.shippingFee === 0 ? 'FREE' : `Rs.${order.shippingFee}`}</span>
                </div>
                <div className="print-divider-dashed"></div>
                <div className="flex justify-between font-bold text-xs pt-0.5">
                  <span>PAY:</span>
                  <span>Rs.{order.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="border border-black p-1 text-center font-bold text-[9px] my-1.5">
                CASH DUE: RS. {order.grandTotal.toLocaleString()}
              </div>

              <div className="text-center text-[8px] text-neutral-600 mt-2">
                THANK YOU FOR SHOPPING!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
