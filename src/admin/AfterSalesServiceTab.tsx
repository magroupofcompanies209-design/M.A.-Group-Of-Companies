import React, { useState, useEffect } from 'react';
import type {
  WarrantyRegistration,
  ServiceRequest,
  ServiceRequestStatus,
  SupportTicket,
} from '../types/index.ts';
import {
  upsertWarrantyRegistrationInSupabase,
  upsertServiceRequestInSupabase,
  upsertSupportTicketInSupabase,
} from '../lib/supabaseClient.ts';
import {
  ShieldCheck,
  Wrench,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';

interface AfterSalesServiceTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AfterSalesServiceTab: React.FC<AfterSalesServiceTabProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<'service' | 'warranty' | 'tickets'>('service');
  const [warranties, setWarranties] = useState<WarrantyRegistration[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const getToken = () =>
    localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, sRes, tRes] = await Promise.all([
        fetch('/api/warranty', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/service-requests', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/support-tickets', { cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (Array.isArray(wRes)) setWarranties(wRes);
      if (Array.isArray(sRes)) setServiceRequests(sRes);
      if (Array.isArray(tRes)) setTickets(tRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateServiceStatus = async (
    req: ServiceRequest,
    status: ServiceRequestStatus,
    assignedTechnician?: string
  ) => {
    const token = getToken();
    const res = await fetch(`/api/service-requests/${req.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        ...(assignedTechnician !== undefined ? { assignedTechnician } : {}),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      await upsertServiceRequestInSupabase(updated, serviceRequests);
      showToast(`Service request ${req.ticketNumber} updated to ${status}`, 'success');
      await loadData();
    }
  };

  const handleUpdateWarrantyStatus = async (
    item: WarrantyRegistration,
    status: WarrantyRegistration['status']
  ) => {
    const token = getToken();
    const res = await fetch(`/api/warranty/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      await upsertWarrantyRegistrationInSupabase(updated, warranties);
      showToast(`Warranty registration updated to ${status}`, 'success');
      await loadData();
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    const token = getToken();
    const res = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        adminReply: replyText.trim(),
        internalNotes: internalNote.trim(),
        status: 'Replied',
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      await upsertSupportTicketInSupabase(updated, tickets);
      showToast(`Reply sent for ticket ${selectedTicket.ticketNumber}`, 'success');
      setSelectedTicket(null);
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 text-[#C9B27C] text-xs font-semibold uppercase tracking-widest mb-1">
            <Wrench className="w-4 h-4" />
            <span>M.A. After-Sales &amp; Client Care</span>
          </div>
          <h2 className="font-luxury-serif text-2xl font-bold text-[#FCFBF8]">
            Warranty, Installation &amp; Support Center
          </h2>
          <p className="text-xs text-[#B8B9BC] mt-1">
            Manage product warranty registrations, field installation/repair requests, and customer
            support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'service', label: `Service & Installation (${serviceRequests.length})`, icon: Wrench },
            { id: 'warranty', label: `Warranty Registrations (${warranties.length})`, icon: ShieldCheck },
            { id: 'tickets', label: `Support Tickets (${tickets.length})`, icon: MessageSquare },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  subTab === t.id
                    ? 'bg-[#C9B27C] text-[#0D0E10]'
                    : 'bg-[#151C2C] text-[#B8B9BC] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C9B27C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* SERVICE & INSTALLATION REQUESTS */}
      {subTab === 'service' && (
        <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                <th className="py-3.5 px-4">Ticket #</th>
                <th className="py-3.5 px-4">Type &amp; Product</th>
                <th className="py-3.5 px-4">Customer &amp; City</th>
                <th className="py-3.5 px-4">Technician</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {serviceRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No service or installation requests submitted yet.
                  </td>
                </tr>
              ) : (
                serviceRequests.map((srv) => (
                  <tr key={srv.id} className="hover:bg-[#0D0E10]/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#C9B27C]">
                      {srv.ticketNumber}
                      {srv.orderNumber && (
                        <span className="block text-[10px] text-neutral-400">
                          Order: {srv.orderNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{srv.requestType}</div>
                      <div className="text-neutral-300">{srv.productName}</div>
                      <div className="text-[11px] text-neutral-400">{srv.issueDescription}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{srv.customerName}</div>
                      <div className="text-neutral-400 font-mono">{srv.customerPhone}</div>
                      <div className="text-[11px] text-[#C9B27C]">
                        {srv.address}, {srv.city}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        defaultValue={srv.assignedTechnician || ''}
                        placeholder="Assign Engineer..."
                        onBlur={(e) =>
                          handleUpdateServiceStatus(srv, srv.status, e.target.value)
                        }
                        className="px-2.5 py-1.5 rounded bg-[#0D0E10] border border-neutral-700 text-white"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={srv.status}
                        onChange={(e) =>
                          handleUpdateServiceStatus(
                            srv,
                            e.target.value as ServiceRequestStatus
                          )
                        }
                        className="px-2.5 py-1.5 rounded bg-[#0D0E10] border border-[#C9B27C]/40 text-white font-semibold"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WARRANTY REGISTRATIONS */}
      {subTab === 'warranty' && (
        <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Product &amp; Serial</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Purchase Date &amp; Term</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {warranties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No product warranty registrations recorded yet.
                  </td>
                </tr>
              ) : (
                warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-[#0D0E10]/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#C9B27C]">
                      {w.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{w.productName}</div>
                      <div className="font-mono text-[11px] text-neutral-400">
                        S/N: {w.serialNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{w.customerName}</div>
                      <div className="font-mono text-neutral-400">{w.customerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-white">{w.purchaseDate}</div>
                      <div className="text-[11px] text-[#C9B27C]">{w.warrantyPeriod}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={w.status}
                        onChange={(e) =>
                          handleUpdateWarrantyStatus(w, e.target.value as any)
                        }
                        className="px-2.5 py-1.5 rounded bg-[#0D0E10] border border-neutral-700 text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Claimed">Claimed</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUPPORT TICKETS */}
      {subTab === 'tickets' && (
        <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4">Subject &amp; Message</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No support tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#0D0E10]/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#C9B27C]">
                      {t.ticketNumber}
                      <span className="block text-[10px] text-neutral-400">{t.inquiryType}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{t.subject}</div>
                      <div className="text-neutral-300 line-clamp-2">{t.message}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{t.customerName}</div>
                      <div className="font-mono text-neutral-400">{t.customerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#C9B27C]">{t.status}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(t);
                          setReplyText(t.adminReply || '');
                          setInternalNote(t.internalNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
                      >
                        Reply / Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleReplyTicket}
            className="bg-[#151C2C] border border-[#C9B27C] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs text-white"
          >
            <h3 className="font-luxury-serif text-lg font-bold text-[#C9B27C]">
              Reply to Ticket {selectedTicket.ticketNumber}
            </h3>
            <div className="p-3 rounded-lg bg-[#0D0E10] border border-neutral-800 space-y-1">
              <div className="font-bold">{selectedTicket.subject}</div>
              <p className="text-neutral-300">{selectedTicket.message}</p>
            </div>
            <div className="space-y-1">
              <label className="text-neutral-300 font-semibold">Official Response to Client</label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-300 font-semibold">Internal Admin Note</label>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
