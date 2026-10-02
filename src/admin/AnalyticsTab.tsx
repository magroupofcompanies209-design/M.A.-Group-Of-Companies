import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  XCircle,
  RefreshCw,
  BarChart3,
  Percent,
} from 'lucide-react';
import { safeJsonResponse } from '../utils/api';

interface AnalyticsTabProps {
  adminToken: string;
  adminRole: string;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ adminToken, adminRole }) => {
  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'previousMonth'>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/advanced?range=${range}`, {
        headers: {
          'x-admin-token': adminToken,
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const json = await safeJsonResponse(res, null);
      if (json && !json.error) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load advanced analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const canViewProfit = adminRole === 'superadmin' || adminRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>Advanced Analytics &amp; Profit Engine</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Authoritative sales velocity, order fulfillment funnels, product performance, and gross margin tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Pills */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
            {[
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'This Week', value: 'week' },
              { label: 'This Month', value: 'month' },
              { label: 'Prev Month', value: 'previousMonth' },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRange(p.value as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  range === p.value
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Selected Period Sales</span>
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
                Rs.{' '}
                {(range === 'today'
                  ? data.sales.today
                  : range === 'yesterday'
                  ? data.sales.yesterday
                  : range === 'week'
                  ? data.sales.thisWeek
                  : range === 'previousMonth'
                  ? data.sales.previousMonth
                  : data.sales.thisMonth
                ).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Total Lifetime: Rs. {data.sales.totalSales.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Order Volume</span>
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {(range === 'today'
                  ? data.orders.todayCount
                  : range === 'week'
                  ? data.orders.weekCount
                  : data.orders.monthCount
                ).toLocaleString()}{' '}
                <span className="text-xs text-neutral-500 font-normal">orders</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                All-time Orders: {data.orders.total}
              </div>
            </div>

            {/* Profit Tracking (Private to Admins) */}
            {canViewProfit && (
              <>
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>Est. Gross Profit</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
                    Rs. {data.profit.estimatedGrossProfit.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Cost of Goods: Rs. {data.profit.totalCost.toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                    <span>Gross Profit Margin</span>
                    <Percent className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-purple-300 mt-1">
                    {data.profit.estimatedGrossMarginPercent}%
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Based on product cost records
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fulfillment Funnel */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              Order Fulfillment Pipeline Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { label: 'Pending', count: data.orders.statusCounts.Pending || 0, color: 'text-amber-400' },
                { label: 'Confirmed', count: data.orders.statusCounts.Confirmed || 0, color: 'text-blue-400' },
                { label: 'Processing', count: data.orders.statusCounts.Processing || 0, color: 'text-indigo-400' },
                { label: 'Shipped', count: data.orders.statusCounts.Shipped || 0, color: 'text-purple-400' },
                { label: 'Delivered', count: data.orders.statusCounts.Delivered || 0, color: 'text-emerald-400' },
              ].map((st) => (
                <div key={st.label} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">{st.label}</div>
                  <div className={`text-lg font-black mt-1 font-mono ${st.color}`}>{st.count}</div>
                </div>
              ))}
            </div>
            {(data.orders.statusCounts.Cancelled > 0 || data.orders.statusCounts.Returned > 0 || data.orders.statusCounts['Failed Delivery'] > 0) && (
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-neutral-800/80 text-xs text-neutral-400">
                <span>Cancelled: <strong className="text-rose-400 font-mono">{data.orders.statusCounts.Cancelled || 0}</strong></span>
                <span>Returned: <strong className="text-amber-400 font-mono">{data.orders.statusCounts.Returned || 0}</strong></span>
                <span>Failed Delivery: <strong className="text-rose-400 font-mono">{data.orders.statusCounts['Failed Delivery'] || 0}</strong></span>
              </div>
            )}
          </div>

          {/* Best-Selling vs Slow-Moving Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Sellers */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center justify-between">
                <span>🔥 Best-Selling Equipment</span>
                <span className="text-[11px] text-neutral-500 font-mono">By volume</span>
              </h3>
              <div className="divide-y divide-neutral-800/60 text-xs">
                {data.products.bestSelling.map((b: any, idx: number) => (
                  <div key={b.product.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-neutral-500 font-mono font-bold">{idx + 1}.</span>
                      <div>
                        <div className="font-bold text-white line-clamp-1">{b.product.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{b.product.sku}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-amber-400 font-mono">{b.unitsSold} units</div>
                      <div className="text-[10px] text-neutral-500 font-mono">Rs. {b.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slow Moving */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center justify-between">
                <span>💤 Slow-Moving Inventory</span>
                <span className="text-[11px] text-neutral-500 font-mono">0-1 unit sold</span>
              </h3>
              <div className="divide-y divide-neutral-800/60 text-xs">
                {data.products.slowMoving.map((s: any) => (
                  <div key={s.product.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-neutral-300 line-clamp-1">{s.product.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {s.product.sku} | In-Stock: {s.product.stock}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 font-mono">
                        {s.unitsSold} sold
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
