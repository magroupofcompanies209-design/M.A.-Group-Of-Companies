import React, { useState } from 'react';
import type { Product, InventoryLedgerEntry, InventoryChangeReason } from '../types/index.ts';
import {
  Layers,
  Search,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface InventoryTabProps {
  products: Product[];
  inventoryLedger: InventoryLedgerEntry[];
  adminToken: string;
  adminRole: string;
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  inventoryLedger,
  adminToken,
  adminRole,
  onRefresh,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [changeAmount, setChangeAmount] = useState<number>(1);
  const [isDeduction, setIsDeduction] = useState(false);
  const [reason, setReason] = useState<InventoryChangeReason>('Stock Received');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const inventoryValuation = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  });

  // Filtered Ledger
  const filteredLedger = inventoryLedger.filter((entry) => {
    if (reasonFilter !== 'all' && entry.reason !== reasonFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      entry.productName.toLowerCase().includes(q) ||
      entry.sku.toLowerCase().includes(q) ||
      (entry.referenceId && entry.referenceId.toLowerCase().includes(q))
    );
  });

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (changeAmount <= 0) {
      showToast('Please enter a valid stock change quantity.', 'error');
      return;
    }

    const finalChange = isDeduction ? -changeAmount : changeAmount;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          change: finalChange,
          reason,
          referenceId: referenceId || (isDeduction ? 'MANUAL-DEC' : 'PO-STOCK-IN'),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to adjust stock.');
      }

      showToast(
        `Stock updated for ${selectedProduct.name}: ${finalChange > 0 ? '+' : ''}${finalChange} (New Stock: ${data.newStock})`,
        'success'
      );
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
      setChangeAmount(1);
      setNotes('');
      setReferenceId('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Stock adjustment failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setChangeAmount(1);
    setIsDeduction(false);
    setReason('Stock Received');
    setReferenceId('');
    setNotes('');
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>Advanced Inventory Engine &amp; Ledger</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Authoritative physical stock tracking, automatic order deductions, returns restoration, and audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center gap-1.5 border border-neutral-800 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Catalog Stock</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {totalStockUnits.toLocaleString()}{' '}
            <span className="text-xs text-neutral-500 font-normal">units</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Inventory Valuation</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
            Rs. {inventoryValuation.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
            {lowStockCount} <span className="text-xs text-neutral-500 font-normal">items</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Out of Stock</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
            {outOfStockCount} <span className="text-xs text-neutral-500 font-normal">items</span>
          </div>
        </div>
      </div>

      {/* Section 1: Product Stock Quick Adjustments */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <span>Warehouse Stock Levels</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                {products.length} Products
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Click &quot;Adjust Stock&quot; to record safe server-side transactions with ledger history.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800 max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-bold sticky top-0 border-b border-neutral-800">
              <tr>
                <th className="p-3">Product Name &amp; SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Current Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock === 0;
                const isLowStock = p.stock > 0 && p.stock <= p.lowStockThreshold;

                return (
                  <tr key={p.id} className="hover:bg-neutral-800/40">
                    <td className="p-3">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[11px] font-mono text-neutral-400">{p.sku}</div>
                    </td>
                    <td className="p-3 text-neutral-300">{p.categoryName}</td>
                    <td className="p-3 text-center font-mono font-bold text-sm">
                      <span
                        className={
                          isOutOfStock
                            ? 'text-rose-400'
                            : isLowStock
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          OUT OF STOCK
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          LOW STOCK (≤{p.lowStockThreshold})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          IN STOCK
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-neutral-200">
                      Rs. {p.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(p)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Historical Inventory Audit Ledger */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Inventory Audit Ledger History</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                {filteredLedger.length} Movements
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Every stock movement (order, return, cancellation, restock) is immutably logged with timestamp and author.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 cursor-pointer focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Movement Reasons</option>
              <option value="Stock Received">Stock Received</option>
              <option value="Order Placed">Order Placed (COD)</option>
              <option value="Order Cancelled">Order Cancelled</option>
              <option value="Order Returned">Order Returned</option>
              <option value="Manual Adjustment">Manual Adjustment</option>
              <option value="Damaged/Discarded">Damaged / Discarded</option>
              <option value="Initial Stock">Initial Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800 max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-bold sticky top-0 border-b border-neutral-800">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Product &amp; SKU</th>
                <th className="p-3 text-center">Change</th>
                <th className="p-3 text-center">Stock Shift</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Reference / Order</th>
                <th className="p-3">Author</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredLedger.map((entry) => {
                const isPositive = entry.change > 0;
                return (
                  <tr key={entry.id} className="hover:bg-neutral-800/40 font-mono">
                    <td className="p-3 text-neutral-400 text-[11px] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-sans">
                      <div className="font-bold text-white">{entry.productName}</div>
                      <div className="text-[11px] text-neutral-500">{entry.sku}</div>
                    </td>
                    <td className="p-3 text-center font-bold text-sm">
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPositive ? `+${entry.change}` : entry.change}
                      </span>
                    </td>
                    <td className="p-3 text-center text-neutral-300">
                      {entry.previousStock} &rarr; <span className="font-bold text-white">{entry.newStock}</span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-200">
                        {entry.reason}
                      </span>
                    </td>
                    <td className="p-3 text-amber-400 font-bold">{entry.referenceId || '-'}</td>
                    <td className="p-3 font-sans text-neutral-300">{entry.performedBy}</td>
                    <td className="p-3 font-sans text-neutral-400 text-[11px] max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Stock Adjustment: {selectedProduct.name}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Current in-stock: <span className="font-bold text-white font-mono">{selectedProduct.stock} units</span>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-5">
              {/* Type Toggle: Increase vs Decrease */}
              <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeduction(false);
                    setReason('Stock Received');
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !isDeduction ? 'bg-emerald-500 text-neutral-950 shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Receive Stock (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeduction(true);
                    setReason('Manual Adjustment');
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isDeduction ? 'bg-rose-500 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct Stock (-)</span>
                </button>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">
                  {isDeduction ? 'Quantity to Deduct' : 'Quantity to Add'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={isDeduction ? selectedProduct.stock : 10000}
                  required
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-neutral-400">
                  Projected new balance:{' '}
                  <span className="font-bold text-white font-mono">
                    {isDeduction
                      ? Math.max(0, selectedProduct.stock - changeAmount)
                      : selectedProduct.stock + changeAmount}{' '}
                    units
                  </span>
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">Adjustment Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as InventoryChangeReason)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs cursor-pointer focus:outline-none focus:border-amber-500"
                >
                  {!isDeduction ? (
                    <>
                      <option value="Stock Received">Stock Received from Supplier / Factory</option>
                      <option value="Order Returned">Customer Return Restock</option>
                      <option value="Manual Adjustment">Manual Inventory Audit Count</option>
                    </>
                  ) : (
                    <>
                      <option value="Manual Adjustment">Physical Audit Correction</option>
                      <option value="Damaged/Discarded">Damaged in Transit / Warehouse Discard</option>
                      <option value="Order Placed">Offline B2B Order Consignment</option>
                    </>
                  )}
                </select>
              </div>

              {/* Reference ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">Reference / PO Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO-8921 or Restock-Batch-4"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">Internal Audit Note</label>
                <textarea
                  rows={2}
                  placeholder="Reason for adjustment, container consignment, inspector name..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Transaction...' : 'Commit Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
