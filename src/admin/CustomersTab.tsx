import React, { useState } from 'react';
import type { CustomerProfile, CustomerSegment } from '../types/index.ts';
import {
  Users,
  Search,
  MessageCircle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  MapPin,
  Phone,
  Clock,
  Edit,
  Save,
  X,
} from 'lucide-react';

interface CustomersTabProps {
  customers: CustomerProfile[];
  adminToken: string;
  adminRole: string;
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  adminToken,
  onRefresh,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [editingNoteCustomer, setEditingNoteCustomer] = useState<CustomerProfile | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Factual Metrics
  const totalCustomers = customers.length;
  const highValueCount = customers.filter((c) => c.segment === 'High-Value').length;
  const returningCount = customers.filter((c) => c.segment !== 'New').length;
  const repeatRate = totalCustomers > 0 ? Math.round((returningCount / totalCustomers) * 100) : 0;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleOpenNoteModal = (customer: CustomerProfile) => {
    setEditingNoteCustomer(customer);
    setNoteContent(customer.internalNotes || '');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoteCustomer) return;

    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(editingNoteCustomer.phone)}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ notes: noteContent }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update customer note.');
      }

      showToast('Internal customer note updated successfully.', 'success');
      setEditingNoteCustomer(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Customer Profiles &amp; Behavioral Segmentation</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Factual purchasing history, COD delivery performance rates, and internal staff notes.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Customers</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">
            {totalCustomers.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Repeat Purchase Rate</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
            {repeatRate}% <span className="text-xs text-neutral-500 font-normal">({returningCount} buyers)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">High-Value Accounts</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
            {highValueCount} <span className="text-xs text-neutral-500 font-normal">(&gt;Rs.100k)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Customer Spend</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
            Rs. {totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Segmentation Filter Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Segment Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs w-full md:w-auto">
          {[
            { label: 'All Buyers', value: 'all', count: customers.length },
            { label: 'New', value: 'New', count: customers.filter((c) => c.segment === 'New').length },
            { label: 'Returning', value: 'Returning', count: customers.filter((c) => c.segment === 'Returning').length },
            { label: 'Frequent', value: 'Frequent', count: customers.filter((c) => c.segment === 'Frequent').length },
            { label: 'High-Value', value: 'High-Value', count: customers.filter((c) => c.segment === 'High-Value').length },
            { label: 'Inactive', value: 'Inactive', count: customers.filter((c) => c.segment === 'Inactive').length },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSegmentFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                segmentFilter === tab.value
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, city..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Customer Profiles Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950 text-neutral-400 uppercase font-bold border-b border-neutral-800">
            <tr>
              <th className="p-3.5">Customer &amp; Contact</th>
              <th className="p-3.5">City &amp; Address</th>
              <th className="p-3.5 text-center">Orders History</th>
              <th className="p-3.5 text-right">Total Spend</th>
              <th className="p-3.5 text-center">Segment</th>
              <th className="p-3.5 text-center">COD Risk Profile</th>
              <th className="p-3.5">Internal Staff Notes</th>
              <th className="p-3.5 text-center">Quick Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredCustomers.map((c) => {
              const cleanPhone = c.phone.replace(/[^0-9]/g, '');
              const waLink = `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=Assalam%20o%20Alaikum%20${encodeURIComponent(c.fullName)}%2C%20regarding%20your%20order%20with%20M.A.%20Group%20of%20Companies...`;

              return (
                <tr key={c.phone} className="hover:bg-neutral-800/40">
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm">{c.fullName}</div>
                    <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-neutral-500" />
                      <span>{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="text-[10px] text-neutral-500 mt-0.5">{c.email}</div>
                    )}
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-neutral-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{c.city}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 max-w-xs truncate mt-0.5">
                      {c.addresses[0] || 'No street specified'}
                    </div>
                  </td>

                  <td className="p-3.5 text-center font-mono">
                    <div className="font-bold text-white text-sm">{c.totalOrders} Orders</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      <span className="text-emerald-400">{c.deliveredOrders} delivered</span>
                      {c.cancelledOrders > 0 && (
                        <span className="text-rose-400 ml-1">({c.cancelledOrders} cancelled)</span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 text-right font-mono">
                    <div className="font-bold text-amber-400 text-sm">
                      Rs. {c.totalSpend.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      AOV: Rs. {c.averageOrderValue.toLocaleString()}
                    </div>
                  </td>

                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.segment === 'High-Value'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : c.segment === 'Frequent'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : c.segment === 'Returning'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : c.segment === 'Inactive'
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {c.segment}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.riskScore === 'REVIEW REQUIRED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : c.riskScore === 'LOW RISK'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {c.riskScore}
                    </span>
                  </td>

                  <td className="p-3.5 max-w-xs">
                    {c.internalNotes ? (
                      <div className="text-[11px] text-neutral-300 bg-neutral-950 p-2 rounded-lg border border-neutral-800 italic line-clamp-2">
                        &ldquo;{c.internalNotes}&rdquo;
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-600 italic">No notes</span>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenNoteModal(c)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 transition-colors cursor-pointer"
                        title="Edit Internal Note"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Internal Staff Note Modal */}
      {editingNoteCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Internal Note: {editingNoteCustomer.fullName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingNoteCustomer(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">
                  Staff Internal Log (Private — Never visible to customer)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Verified contractor for DHA phase 6 site; preferred morning delivery time..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingNoteCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
