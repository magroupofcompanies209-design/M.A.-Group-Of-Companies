import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Percent,
  Layers,
  Tag,
  Briefcase,
  Activity,
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
      const res = await fetch(`/api/admin/analytics/advanced?range=${range}&_t=${Date.now()}`, {
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

  const statusCounts = data?.orders?.statusCounts || {};
  const categorySales = data?.categories || [];
  const inventoryStats = data?.inventory || {
    totalProducts: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValuation: 0,
  };
  const customerStats = data?.customers || {
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    repeatCustomersCount: 0,
    topCustomers: [],
  };
  const promotionStats = data?.promotions || {
    activeOffersCount: 0,
    activeCouponsCount: 0,
    ordersWithPromoCount: 0,
    totalDiscountsGranted: 0,
  };
  const quotationStats = data?.quotations || {
    totalQuotations: 0,
    pendingQuotations: 0,
    approvedQuotations: 0,
  };
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="p-6 rounded-2xl bg-[#0D0E10] border border-[#C9B27C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9B27C] flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>M.A. GROUP EXECUTIVE INTELLIGENCE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-luxury-serif font-semibold text-[#FCFBF8] mt-1">
            Business Analytics, Revenue &amp; Inventory Performance
          </h2>
          <p className="text-xs text-[#B8B9BC] mt-1">
            Real-time database metrics across orders, category revenue, stock valuation, customer retention, and B2B/Solution quotations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#151C2C] border border-[#C9B27C]/30 rounded-xl p-1 text-xs">
            {[
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: '7 Days', value: 'week' },
              { label: '30 Days', value: 'month' },
              { label: 'Prev Month', value: 'previousMonth' },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRange(p.value as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  range === p.value
                    ? 'bg-[#C9B27C] text-[#0D0E10] shadow-xs'
                    : 'text-[#B8B9BC] hover:text-white'
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
            className="p-2.5 rounded-xl bg-[#151C2C] border border-[#C9B27C]/30 text-[#C9B27C] hover:bg-[#C9B27C] hover:text-[#0D0E10] cursor-pointer transition-all"
            title="Refresh Real-Time Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* 1. Primary Revenue & Order KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#B8B9BC] flex items-center justify-between">
                <span>Total Lifetime Revenue</span>
                <DollarSign className="w-4 h-4 text-[#C9B27C]" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#C9B27C] mt-2 font-mono">
                PKR {(data.sales?.totalSales || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#B8B9BC] mt-1 flex items-center justify-between">
                <span>Today: PKR {(data.sales?.today || 0).toLocaleString()}</span>
                <span>30d: PKR {(data.sales?.thisMonth || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#B8B9BC] flex items-center justify-between">
                <span>Total Orders &amp; AOV</span>
                <ShoppingBag className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#FCFBF8] mt-2 font-mono">
                {(data.orders?.total || 0).toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#B8B9BC]">orders</span>
              </div>
              <div className="text-[11px] text-[#C9B27C] mt-1 font-mono">
                Avg Order Value: PKR {(data.orders?.averageOrderValue || 0).toLocaleString()}
              </div>
            </div>

            {canViewProfit && (
              <>
                <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>Est. Gross Profit</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2 font-mono">
                    PKR {(data.profit?.estimatedGrossProfit || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#B8B9BC] mt-1">
                    Margin: {data.profit?.estimatedGrossMarginPercent || 0}%
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#C9B27C] flex items-center justify-between">
                    <span>Inventory Valuation</span>
                    <Package className="w-4 h-4 text-[#C9B27C]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#FCFBF8] mt-2 font-mono">
                    PKR {(inventoryStats.totalInventoryValuation || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#B8B9BC] mt-1">
                    {inventoryStats.inStockCount} In Stock | {inventoryStats.lowStockCount} Low Stock
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Order Status Pipeline */}
          <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.18em]">
                Order Fulfillment Pipeline Breakdown
              </h3>
              <span className="text-[11px] text-[#C9B27C] font-mono">
                7-Day Orders: {data.orders?.weekCount || 0} | 30-Day Orders: {data.orders?.monthCount || 0}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { label: 'Pending', count: statusCounts.Pending || 0, color: 'text-amber-400' },
                { label: 'Confirmed', count: statusCounts.Confirmed || 0, color: 'text-sky-400' },
                { label: 'Processing', count: statusCounts.Processing || 0, color: 'text-indigo-400' },
                { label: 'Shipped', count: statusCounts.Shipped || 0, color: 'text-purple-400' },
                { label: 'Delivered', count: statusCounts.Delivered || 0, color: 'text-emerald-400' },
                { label: 'Cancelled', count: statusCounts.Cancelled || 0, color: 'text-rose-400' },
              ].map((st) => (
                <div
                  key={st.label}
                  className="p-3.5 bg-[#0D0E10] rounded-xl border border-[#C9B27C]/25 text-center"
                >
                  <div className="text-[10px] text-[#B8B9BC] font-bold uppercase tracking-wider">
                    {st.label}
                  </div>
                  <div className={`text-xl font-black mt-1 font-mono ${st.color}`}>{st.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Category Performance & Inventory Health */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Analytics */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.18em] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#C9B27C]" />
                  <span>Category Sales &amp; Revenue Breakdown</span>
                </h3>
                <span className="text-[11px] text-[#B8B9BC]">Top Performing Catalogs</span>
              </div>

              <div className="space-y-3">
                {categorySales.length === 0 ? (
                  <p className="text-xs text-[#B8B9BC]">No category sales recorded yet.</p>
                ) : (
                  categorySales.slice(0, 6).map((cat: any) => {
                    const maxRev = Math.max(...categorySales.map((c: any) => c.revenue || 1), 1);
                    const pct = Math.min(100, Math.round(((cat.revenue || 0) / maxRev) * 100));
                    return (
                      <div key={cat.categoryId || cat.categoryName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#FCFBF8]">{cat.categoryName}</span>
                          <span className="font-mono text-[#C9B27C]">
                            PKR {(cat.revenue || 0).toLocaleString()} ({cat.unitsSold || 0} units)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#0D0E10] overflow-hidden border border-[#C9B27C]/20">
                          <div
                            className="h-full bg-[#C9B27C] rounded-full"
                            style={{ width: `${Math.max(6, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Inventory, Customers & Promotions Summary */}
            <div className="lg:col-span-5 space-y-4">
              {/* Inventory Health */}
              <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-3">
                <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.18em] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C9B27C]" />
                  <span>Inventory &amp; Stock Health</span>
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-3 rounded-xl bg-[#0D0E10] border border-emerald-500/30">
                    <div className="text-[10px] text-[#B8B9BC] uppercase">In Stock</div>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                      {inventoryStats.inStockCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0E10] border border-amber-500/30">
                    <div className="text-[10px] text-[#B8B9BC] uppercase">Low Stock</div>
                    <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                      {inventoryStats.lowStockCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0E10] border border-rose-500/30">
                    <div className="text-[10px] text-[#B8B9BC] uppercase">Out of Stock</div>
                    <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                      {inventoryStats.outOfStockCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Offer Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#C9B27C] font-bold uppercase text-[11px]">
                    <span>Customer Retention</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-black text-[#FCFBF8] font-mono">
                    {customerStats.totalCustomers} Accounts
                  </div>
                  <div className="text-[11px] text-[#B8B9BC]">
                    New (30d): {customerStats.newCustomersThisMonth} | Repeat: {customerStats.repeatCustomersCount}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#C9B27C] font-bold uppercase text-[11px]">
                    <span>Offers &amp; Quotations</span>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-black text-[#FCFBF8] font-mono">
                    {quotationStats.totalQuotations} Quotes
                  </div>
                  <div className="text-[11px] text-[#B8B9BC]">
                    Active Offers: {promotionStats.activeOffersCount} | Promo Orders: {promotionStats.ordersWithPromoCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Best-Selling vs Slow-Moving Products & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Best Sellers */}
            <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-3">
              <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.16em] flex items-center justify-between">
                <span>Top Selling Products</span>
                <span className="text-[10px] text-[#C9B27C] font-mono">By Units &amp; PKR</span>
              </h3>
              <div className="divide-y divide-[#C9B27C]/15 text-xs">
                {(data.products?.bestSelling || []).slice(0, 6).map((b: any, idx: number) => (
                  <div key={b.product.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#FCFBF8] truncate">
                        {idx + 1}. {b.product.name}
                      </div>
                      <div className="text-[10px] text-[#B8B9BC] font-mono">SKU: {b.product.sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#C9B27C] font-mono">{b.unitsSold} sold</div>
                      <div className="text-[10px] text-[#B8B9BC] font-mono">
                        PKR {(b.revenue || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low / Out of Stock Products */}
            <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-3">
              <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.16em] flex items-center justify-between">
                <span>Slow Moving &amp; Stock Alerts</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <div className="divide-y divide-[#C9B27C]/15 text-xs">
                {(data.products?.slowMoving || []).slice(0, 6).map((s: any) => (
                  <div key={s.product.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#FCFBF8] truncate">{s.product.name}</div>
                      <div className="text-[10px] text-[#B8B9BC] font-mono">
                        Stock: {s.product.stock} | SKU: {s.product.sku}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0D0E10] border border-[#C9B27C]/25 text-[#C9B27C] text-[10px] font-mono shrink-0">
                      {s.unitsSold} sold
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Executive Activity */}
            <div className="p-5 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 space-y-3">
              <h3 className="font-bold text-[#FCFBF8] text-xs uppercase tracking-[0.16em] flex items-center justify-between">
                <span>Recent Business Activity</span>
                <Activity className="w-3.5 h-3.5 text-[#C9B27C]" />
              </h3>
              <div className="divide-y divide-[#C9B27C]/15 text-xs">
                {recentActivity.length === 0 ? (
                  <p className="text-[#B8B9BC] py-2">No recent activity.</p>
                ) : (
                  recentActivity.slice(0, 6).map((act: any) => (
                    <div key={act.id} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#FCFBF8]">{act.title}</span>
                        <span className="text-[10px] font-mono text-[#C9B27C]">{act.meta}</span>
                      </div>
                      <div className="text-[11px] text-[#B8B9BC] flex items-center justify-between">
                        <span className="truncate">{act.subtitle}</span>
                        <span className="text-[10px]">
                          {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
