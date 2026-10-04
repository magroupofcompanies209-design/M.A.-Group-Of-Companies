import React, { useState } from 'react';
import type { Order } from '../../types/index.ts';
import { Printer, X } from 'lucide-react';
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
  const tagline = settings?.tagline || '';
  const logoUrl = settings?.receiptLogoUrl || '';
  const phoneDisplay = settings?.contactPhone || '';
  const emailDisplay = settings?.contactEmail || '';
  const addressDisplay = settings?.headOfficeAddress || '';
  const footerNote =
    settings?.receiptFooterNote || 'Thank you for shopping with M.A. GROUP OF COMPANIES';

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

  // Always compute real-time totals from the latest saved order items if available
  const computedSubtotal =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.reduce(
          (sum, it) => sum + (Number(it.total) || Number(it.price) * Number(it.quantity) || 0),
          0
        )
      : Number(order.subtotal || 0);
  const effectiveSubtotal = Number(order.subtotal ?? computedSubtotal);
  const effectiveDiscount = Number(order.discount ?? 0);
  const effectiveShipping = Number(order.shippingFee ?? 0);
  const effectiveGrandTotal = Number(
    order.grandTotal ?? Math.max(0, effectiveSubtotal - effectiveDiscount + effectiveShipping)
  );

  // Invoice Number uses the permanent Order Number (or order.id) stored in Supabase
  const invoiceNumber = order.orderNumber || order.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container - on screen shows dark preview modal, during window.print() only .print-friendly prints */}
      <div className="bg-[#111318] border border-[#1A1D23] rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* On-screen Controls Bar (Excluded during printing via .no-print) */}
        <div className="no-print p-4 border-b border-[#1A1D23] bg-[#0B0D10] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>SALES INVOICE</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-semibold">
                  {invoiceNumber}
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                A4 Printable Sales Invoice &amp; PDF Export (M.A. GROUP OF COMPANIES)
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
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
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
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
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
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                58mm POS
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT INVOICE</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#6B7280] hover:text-white hover:bg-[#1A1D23] transition-colors cursor-pointer"
              title="Close Invoice Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Invoice Preview Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0B0D10]/80 flex justify-center">
          {/* ==============================================================
              A4 STANDARD SALES INVOICE TEMPLATE
              ============================================================== */}
          {format === 'a4' && (
            <div className="print-friendly receipt-a4 bg-white text-black p-8 rounded-lg shadow-lg border border-neutral-200">
              {/* Company Header & Invoice Title */}
              <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
                <div className="flex items-start gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={storeName}
                      className="max-h-16 max-w-[140px] object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 border-2 border-black flex items-center justify-center font-black text-lg tracking-tighter shrink-0">
                      M.A
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase">{storeName}</h1>
                    {tagline && (
                      <p className="text-xs font-semibold text-neutral-700 tracking-wider uppercase mt-0.5">
                        {tagline}
                      </p>
                    )}
                    {addressDisplay && (
                      <p className="text-xs text-neutral-700 mt-1">{addressDisplay}</p>
                    )}
                    {(phoneDisplay || emailDisplay) && (
                      <p className="text-xs text-neutral-700">
                        {phoneDisplay ? `Phone: ${phoneDisplay}` : ''}
                        {phoneDisplay && emailDisplay ? ' | ' : ''}
                        {emailDisplay ? `Email: ${emailDisplay}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3.5 py-1 bg-black text-white font-mono font-black text-sm uppercase tracking-wider mb-1.5">
                    SALES INVOICE
                  </div>
                  <div className="text-sm font-bold font-mono">
                    Invoice / Order ID: #{invoiceNumber}
                  </div>
                  <div className="text-xs text-neutral-700 mt-0.5">
                    Order Date: {formattedDate} {formattedTime}
                  </div>
                </div>
              </div>

              {/* Order Information & Customer Information Grid */}
              <div className="grid grid-cols-2 gap-6 p-4 border border-neutral-300 rounded mb-6 bg-neutral-50/50">
                {/* Customer Information */}
                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase tracking-wider text-neutral-600 border-b border-neutral-300 pb-1 mb-1.5">
                    CUSTOMER INFORMATION
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Customer Name:</span>{' '}
                    <span className="font-semibold">{order.customer?.fullName || 'Guest Customer'}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Phone Number:</span>{' '}
                    <span className="font-mono">{order.customer?.phone || 'N/A'}</span>
                  </div>
                  {order.customer?.email && (
                    <div className="text-xs">
                      <span className="font-bold">Email:</span> {order.customer.email}
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="font-bold">Delivery Address:</span>{' '}
                    <span>
                      {order.customer?.addressLine || ''}
                      {order.customer?.city ? `, ${order.customer.city}` : ''}
                      {order.customer?.province ? `, ${order.customer.province}` : ''}
                    </span>
                  </div>
                  {order.customer?.landmark && (
                    <div className="text-xs">
                      <span className="font-bold">Landmark:</span> {order.customer.landmark}
                    </div>
                  )}
                </div>

                {/* Order Information */}
                <div className="space-y-1">
                  <div className="text-[11px] font-black uppercase tracking-wider text-neutral-600 border-b border-neutral-300 pb-1 mb-1.5">
                    ORDER INFORMATION
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Invoice Number / Order ID:</span>{' '}
                    <span className="font-mono font-bold">#{invoiceNumber}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Order Date:</span> {formattedDate} ({formattedTime})
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Order Status:</span>{' '}
                    <span className="font-bold uppercase">{order.status || 'Pending'}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Payment Method:</span>{' '}
                    <span className="font-bold">CASH ON DELIVERY</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Payment Status:</span>{' '}
                    <span className="font-semibold">{order.paymentStatus || 'Pending (COD)'}</span>
                  </div>
                  {order.trackingNumber && (
                    <div className="text-xs font-mono">
                      <span className="font-bold">Tracking Number:</span> {order.trackingNumber}
                      {order.courierName ? ` (${order.courierName})` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="mb-6">
                <div className="text-[11px] font-black uppercase tracking-wider text-neutral-700 mb-2">
                  ORDER ITEMS
                </div>
                <table className="w-full text-left text-xs border border-neutral-400">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-400 font-bold uppercase text-black">
                      <th className="p-2.5 w-10 text-center border-r border-neutral-300">#</th>
                      <th className="p-2.5 border-r border-neutral-300">Product Name</th>
                      <th className="p-2.5 text-center w-20 border-r border-neutral-300">Quantity</th>
                      <th className="p-2.5 text-right w-28 border-r border-neutral-300">Unit Price</th>
                      <th className="p-2.5 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-300">
                    {(order.items || []).map((item, idx) => {
                      const unitPrice = Number(item.price || 0);
                      const qty = Number(item.quantity || 1);
                      const lineTotal = Number(item.total || unitPrice * qty);
                      return (
                        <tr key={idx} className="receipt-row">
                          <td className="p-2.5 text-center font-mono border-r border-neutral-300">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border-r border-neutral-300">
                            <div className="font-bold text-black">{item.productName}</div>
                            {item.sku && (
                              <div className="text-[10px] text-neutral-600 font-mono">
                                SKU: {item.sku} {item.variantName ? `| ${item.variantName}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold text-black border-r border-neutral-300">
                            {qty}
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-neutral-300">
                            Rs. {unitPrice.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-black">
                            Rs. {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Payment & Totals Section */}
              <div className="grid grid-cols-12 gap-6 items-start mb-8">
                <div className="col-span-7 p-3.5 border border-neutral-300 rounded space-y-1.5 text-xs">
                  <div className="text-[11px] font-black uppercase tracking-wider border-b border-neutral-300 pb-1">
                    PAYMENT DETAILS
                  </div>
                  <div>
                    <span className="font-bold">Payment Method:</span> Cash on Delivery (COD)
                  </div>
                  <div>
                    <span className="font-bold">Payment Status:</span>{' '}
                    {order.paymentStatus || (order.status === 'Delivered' ? 'Paid (COD)' : 'Pending')}
                  </div>
                  <div>
                    <span className="font-bold">Order Status:</span> {order.status || 'Pending'}
                  </div>
                  {order.customerNotes && (
                    <div className="pt-1 text-[11px] italic">
                      <span className="font-bold not-italic">Delivery Note:</span> &ldquo;{order.customerNotes}&rdquo;
                    </div>
                  )}
                </div>

                <div className="col-span-5 border border-neutral-400 rounded p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="font-mono font-bold">Rs. {effectiveSubtotal.toLocaleString()}</span>
                  </div>
                  {effectiveDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        Discount {order.couponCode ? `(${order.couponCode})` : ''}:
                      </span>
                      <span className="font-mono">- Rs. {effectiveDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold">Delivery Charges:</span>
                    <span className="font-mono">
                      {effectiveShipping === 0 ? 'FREE' : `Rs. ${effectiveShipping.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-black text-sm font-black text-black">
                    <span>Grand Total:</span>
                    <span className="font-mono">Rs. {effectiveGrandTotal.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 text-[11px] font-bold text-center uppercase tracking-wider border border-black p-1 rounded mt-1">
                    COD Amount Due: Rs. {effectiveGrandTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="border-t-2 border-black pt-4 text-center space-y-1">
                <div className="font-black text-xs uppercase tracking-wider text-black">
                  Thank you for shopping with {storeName}
                </div>
                {footerNote &&
                  footerNote.toLowerCase() !==
                    `thank you for shopping with ${storeName.toLowerCase()}` && (
                    <div className="text-[11px] text-neutral-700 font-medium">{footerNote}</div>
                  )}
                <div className="text-[10px] text-neutral-600 pt-1">
                  This is a computer-generated sales invoice for Order #{invoiceNumber}.
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              80MM POS THERMAL RECEIPT TEMPLATE
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
                <div className="text-[10px] uppercase font-bold tracking-wider">SALES INVOICE</div>
                {addressDisplay && <div className="text-[10px]">{addressDisplay}</div>}
                {phoneDisplay && <div className="text-[10px]">Ph: {phoneDisplay}</div>}
              </div>

              <div className="print-divider-double"></div>

              <div className="space-y-0.5 my-2">
                <div className="flex justify-between font-bold">
                  <span>INVOICE #{invoiceNumber}</span>
                  <span>{order.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>DATE: {formattedDate}</span>
                  <span>{formattedTime}</span>
                </div>
                <div className="text-[10px] font-bold">PAYMENT: CASH ON DELIVERY (COD)</div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Customer */}
              <div className="my-2 space-y-0.5 text-[11px]">
                <div>
                  <span className="font-bold">CUSTOMER:</span> {order.customer?.fullName}
                </div>
                <div>
                  <span className="font-bold">PHONE:</span> {order.customer?.phone}
                </div>
                <div>
                  <span className="font-bold">ADDRESS:</span> {order.customer?.addressLine},{' '}
                  {order.customer?.city}
                </div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Line Items Header */}
              <div className="grid grid-cols-12 font-bold text-[11px] pb-1 border-b border-black">
                <div className="col-span-6">PRODUCT</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-4 text-right">SUBTOTAL</div>
              </div>

              {/* Line Items */}
              <div className="divide-y divide-dashed divide-neutral-300 my-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="receipt-row py-1 text-[11px]">
                    <div className="font-bold leading-tight">{item.productName}</div>
                    <div className="grid grid-cols-12 text-[10px] text-neutral-700">
                      <div className="col-span-6">Rs.{Number(item.price).toLocaleString()}</div>
                      <div className="col-span-2 text-center font-bold">{item.quantity}x</div>
                      <div className="col-span-4 text-right font-bold text-black font-mono">
                        Rs.{Number(item.total || item.price * item.quantity).toLocaleString()}
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
                  <span>Rs.{effectiveSubtotal.toLocaleString()}</span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>DISCOUNT:</span>
                    <span>-Rs.{effectiveDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>DELIVERY:</span>
                  <span>
                    {effectiveShipping === 0 ? 'FREE' : `Rs.${effectiveShipping.toLocaleString()}`}
                  </span>
                </div>
                <div className="print-divider-dashed"></div>
                <div className="flex justify-between font-black text-sm pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>Rs.{effectiveGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="print-divider-dashed"></div>

              <div className="text-center text-[10px] space-y-0.5 mt-3">
                <div className="font-bold">Thank you for shopping with</div>
                <div className="font-black uppercase">{storeName}</div>
              </div>
            </div>
          )}

          {/* ==============================================================
              58MM POS THERMAL RECEIPT TEMPLATE
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
                <div className="text-[8px] uppercase font-bold">SALES INVOICE</div>
                {phoneDisplay && <div className="text-[8px]">Ph: {phoneDisplay}</div>}
              </div>

              <div className="print-divider-double"></div>

              <div className="my-1 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>INV: #{invoiceNumber}</span>
                  <span>COD</span>
                </div>
                <div className="text-[8px]">
                  {formattedDate} {formattedTime}
                </div>
                <div className="text-[8px] font-bold">STATUS: {order.status}</div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Customer */}
              <div className="my-1 text-[9px] leading-tight">
                <div className="font-bold truncate">{order.customer?.fullName}</div>
                <div>{order.customer?.phone}</div>
                <div>
                  {order.customer?.addressLine}, {order.customer?.city}
                </div>
              </div>

              <div className="print-divider-dashed"></div>

              {/* Items */}
              <div className="space-y-1.5 my-1 text-[9px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="receipt-row leading-tight">
                    <div className="font-bold truncate">{item.productName}</div>
                    <div className="flex justify-between text-[8.5px]">
                      <span>
                        {item.quantity} x Rs.{Number(item.price).toLocaleString()}
                      </span>
                      <span className="font-bold">
                        Rs.{Number(item.total || item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="print-divider-double"></div>

              {/* Totals */}
              <div className="space-y-0.5 text-[9px] my-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>Rs.{effectiveSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>DELIVERY:</span>
                  <span>{effectiveShipping === 0 ? 'FREE' : `Rs.${effectiveShipping}`}</span>
                </div>
                <div className="print-divider-dashed"></div>
                <div className="flex justify-between font-bold text-xs pt-0.5">
                  <span>TOTAL:</span>
                  <span>Rs.{effectiveGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-[8px] mt-2 font-bold">
                Thank you for shopping with {storeName}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
