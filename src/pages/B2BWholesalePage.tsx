import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import { upsertQuotationRequestInSupabase } from '../lib/supabaseClient';
import type { B2BInquiry } from '../types';
import {
  Building2,
  CheckCircle2,
  FileText,
  PhoneCall,
  ShieldCheck,
  Send,
  Truck,
  Copy,
  Search,
} from 'lucide-react';

export const B2BWholesalePage: React.FC = () => {
  const { showToast, settings, customerAccount } = useStore();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: customerAccount?.fullName || '',
    phone: customerAccount?.phone || '',
    email: customerAccount?.email || '',
    city: 'Lahore',
    categoryInterest: 'Solar Projects (EPC / On-Grid)',
    estimatedBudget: 'PKR 1,000,000 - 5,000,000',
    projectDetails: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<B2BInquiry | null>(null);

  // Instant Quote Tracking Code Lookup
  const [trackCodeInput, setTrackCodeInput] = useState('');
  const [trackedQuote, setTrackedQuote] = useState<B2BInquiry | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactPerson || !formData.phone || !formData.projectDetails) {
      showToast('Please fill in required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyName: formData.companyName || 'Commercial Contractor / Project',
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email || customerAccount?.email || 'b2b@magroup.com.pk',
        city: formData.city,
        solutionType: formData.categoryInterest,
        estimatedQuantity: formData.estimatedBudget,
        productsRequired: `${formData.categoryInterest} — ${formData.projectDetails}`,
        notes: formData.projectDetails,
        customerId: customerAccount?.id,
      };

      const res = await fetch('/api/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await safeJsonResponse(res, null);
      if (created && created.id) {
        await upsertQuotationRequestInSupabase(created);
        setSubmittedQuote(created);
        try {
          const savedCodes = JSON.parse(localStorage.getItem('magroup_quote_codes') || '[]');
          if (created.quoteTrackingCode && !savedCodes.includes(created.quoteTrackingCode)) {
            savedCodes.unshift(created.quoteTrackingCode);
            localStorage.setItem('magroup_quote_codes', JSON.stringify(savedCodes.slice(0, 20)));
          }
        } catch {
          // ignore
        }
        showToast(
          `Quotation submitted! Permanent Quote Tracking Code: ${created.quoteTrackingCode}`,
          'success'
        );
      } else {
        showToast('Failed to submit quotation request.', 'error');
      }
    } catch {
      showToast('Failed to submit quotation request. Please try WhatsApp.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCodeInput.trim()) return;
    setTrackingLoading(true);
    setTrackError('');
    setTrackedQuote(null);
    try {
      const code = encodeURIComponent(trackCodeInput.trim().toUpperCase());
      const res = await fetch(`/api/quotations/track/${code}?_t=${Date.now()}`);
      const data = await safeJsonResponse(res, null);
      if (res.ok && data && data.id) {
        setTrackedQuote(data);
      } else {
        setTrackError(
          data?.error || 'Quotation not found. Check your code (e.g. MA-QUOTE-2026-1001).'
        );
      }
    } catch {
      setTrackError('Could not verify Quote Tracking Code.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-14 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0D0E10] via-[#151C2C] to-[#0D0E10] text-[#FCFBF8] rounded-2xl p-8 sm:p-14 border border-[#C9B27C]/30 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#C9B27C] uppercase tracking-[0.2em] bg-[#C9B27C]/10 border border-[#C9B27C]/30 px-3.5 py-1.5 rounded-full">
              <Building2 className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>Commercial &amp; Trade Division</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#FCFBF8] tracking-tight leading-tight">
              Wholesale &amp; Contractor Quotations
            </h1>

            <p className="text-xs sm:text-sm text-[#B8B9BC] leading-relaxed">
              M.A. GROUP OF COMPANIES partners with real estate developers, electrical engineering contractors, solar installers, and institutional buyers across Pakistan. Receive volume-tiered pricing, project support, and dedicated site logistics.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#E5E0D5] shadow-sm space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0D0E10]">Direct Importer Pricing</h3>
            <p className="text-xs text-[#5A5D64] leading-relaxed">
              Direct manufacturer and importer schedules for bulk copper cables, solar containers, and architectural sanitary lots.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#E5E0D5] shadow-sm space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0D0E10]">Site Delivery Logistics</h3>
            <p className="text-xs text-[#5A5D64] leading-relaxed">
              Heavy equipment transported directly to construction job-sites in Lahore, Karachi, Islamabad, and across Pakistan.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#E5E0D5] shadow-sm space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0D0E10]">WAPDA / PEC Compliance</h3>
            <p className="text-xs text-[#5A5D64] leading-relaxed">
              Certified Net-Metering inverters and pure copper laboratory test reports provided with every commercial order.
            </p>
          </div>
        </div>

        {/* Instant Quote Tracking Lookup Bar */}
        <div className="bg-[#151C2C] text-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#C9B27C]/40 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9B27C]">
                Permanent Quotation Tracking
              </span>
              <h2 className="font-serif text-xl font-bold text-[#FCFBF8]">
                Track Existing B2B or Custom Solution Quotation
              </h2>
            </div>
            <span className="text-xs font-mono text-[#C9B27C]">Format: MA-QUOTE-2026-1001</span>
          </div>

          <form onSubmit={handleTrackQuote} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={trackCodeInput}
              onChange={(e) => setTrackCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter Quote Tracking Code (e.g. MA-QUOTE-2026-1001)"
              className="flex-1 px-4 py-3 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/35 text-xs font-mono text-[#FCFBF8]"
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-6 py-3 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{trackingLoading ? 'Checking...' : 'Track Quotation'}</span>
            </button>
          </form>

          {trackError && <p className="text-xs text-rose-400">{trackError}</p>}

          {trackedQuote && (
            <div className="p-5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-sm font-bold text-[#C9B27C]">
                  Code: {trackedQuote.quoteTrackingCode || trackedQuote.id}
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                  Status: {trackedQuote.status}
                </span>
              </div>
              <div className="text-[#FCFBF8] font-semibold">
                {trackedQuote.contactPerson} ({trackedQuote.companyName}) — {trackedQuote.city || 'Pakistan'}
              </div>
              <div className="text-[#B8B9BC]">{trackedQuote.productsRequired}</div>
              <div className="text-[11px] text-[#B8B9BC]/70 font-mono">
                Submitted: {new Date(trackedQuote.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Form Container */}
        <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-10 border border-[#E5E0D5] shadow-sm text-[#292B30]">
          {submittedQuote ? (
            <div className="p-8 text-center space-y-5 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A98B52]">
                  Saved Permanently in Supabase
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#0D0E10]">
                  Quotation Request Registered
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-[#151C2C] text-[#FCFBF8] border border-[#C9B27C] flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-[#B8B9BC]">
                    Permanent Quote Tracking Code
                  </div>
                  <div className="font-mono text-lg font-bold text-[#C9B27C]">
                    {submittedQuote.quoteTrackingCode || submittedQuote.id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      submittedQuote.quoteTrackingCode || submittedQuote.id
                    );
                    showToast('Quote Tracking Code copied!', 'info');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

              <p className="text-xs text-[#5A5D64] leading-relaxed">
                Your Quote Tracking Code <strong className="font-mono text-[#151C2C]">{submittedQuote.quoteTrackingCode}</strong> is permanently stored in our database and remains unchanged after refresh, login/logout, and deployment.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${(settings?.whatsappNumber || '923001234567').replace(/[^0-9]/g, '')}?text=Hello%20M.A.%20Group,%20inquiring%20about%20Quotation%20${submittedQuote.quoteTrackingCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.14em] px-6 py-3 rounded-lg transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Immediate Assistance on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="px-5 py-3 rounded-lg border border-[#B8B9BC] text-xs font-semibold cursor-pointer"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-[#E5E0D5] pb-4">
                <h2 className="font-serif text-2xl font-bold text-[#0D0E10]">
                  Request Commercial Project Quotation
                </h2>
                <p className="text-xs text-[#5A5D64] mt-1">
                  Please provide your project specifications to receive our formal invoice &amp; volume price schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">Company / Firm / Contractor Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Al-Madina Solar Solutions / Tariq Builders"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">
                    Contact Person Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Engr. Asim Raza"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">
                    Mobile / WhatsApp Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0300 1234567"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="procurement@company.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">Project Location (City)</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lahore / Islamabad / Karachi"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">Category of Interest</label>
                  <select
                    value={formData.categoryInterest}
                    onChange={(e) => setFormData({ ...formData, categoryInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] cursor-pointer"
                  >
                    <option value="Solar Projects (EPC / On-Grid)">Solar Projects (EPC / On-Grid / Batteries)</option>
                    <option value="Copper Building Wires & Cables">Copper Building Wires &amp; Cables (Bulk Coils)</option>
                    <option value="Sanitary Ware & Faucets (Multi-Unit)">Sanitary Ware &amp; Faucets (Multi-Unit)</option>
                    <option value="Commercial Kitchen Hobs & Chimneys">Commercial Kitchen Hobs &amp; Chimneys</option>
                    <option value="EV Fleet & Charging Stations">EV Fleet &amp; Charging Stations</option>
                    <option value="Power Tools & Industrial Hardware">Power Tools &amp; Industrial Hardware</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#292B30]">
                  Project Scope &amp; Bill of Quantities (BOQ) Details <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.projectDetails}
                  onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                  placeholder="Mention quantities, inverter capacities, cable coil gauges, delivery timeline, or architectural specs..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E0D5] bg-[#F7F3EA] text-xs text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold uppercase tracking-[0.16em] text-xs px-8 py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting Request...' : 'Submit Quotation Request'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
