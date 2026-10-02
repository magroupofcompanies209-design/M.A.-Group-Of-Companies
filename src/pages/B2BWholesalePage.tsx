import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import {
  Building2,
  CheckCircle2,
  FileText,
  PhoneCall,
  ShieldCheck,
  Send,
  Truck,
  Users,
} from 'lucide-react';

export const B2BWholesalePage: React.FC = () => {
  const { showToast, settings } = useStore();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: 'Lahore',
    categoryInterest: 'Solar Projects (EPC / On-Grid)',
    estimatedBudget: 'PKR 1,000,000 - 5,000,000',
    projectDetails: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactPerson || !formData.phone || !formData.projectDetails) {
      showToast('Please fill in required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await safeJsonResponse(res, { success: false });
      if (data.success) {
        setSubmittedId(data.inquiryNumber);
        showToast('Your wholesale inquiry has been submitted! Our project team will contact you shortly.', 'success');
      }
    } catch {
      showToast('Failed to submit quotation request. Please try WhatsApp.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        {/* Hero Section */}
        <div className="bg-[#111318] text-white rounded-3xl p-8 sm:p-14 border border-[#2B3038] relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#3B82F6] uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-full">
              <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Commercial &amp; Trade Division</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Wholesale &amp; Contractor Quotations
            </h1>

            <p className="text-xs sm:text-sm text-[#E5E7EB] leading-relaxed">
              M.A. GROUP OF COMPANIES partners with real estate developers, electrical engineering contractors, solar installers, and institutional buyers across Pakistan. Get volume-tiered pricing, project credit support, and on-site logistics.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111318] border border-[#2B3038] shadow-lg space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D23] border border-[#2B3038] text-[#3B82F6] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Direct Importer Pricing</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Cut out intermediaries. Direct factory pricing for bulk cables, solar containers, and sanitary lots.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111318] border border-[#2B3038] shadow-lg space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D23] border border-[#2B3038] text-[#3B82F6] flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Site Delivery Logistics</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Heavy equipment transported directly to construction job-sites in Lahore, Karachi, Islamabad, and across Pakistan.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111318] border border-[#2B3038] shadow-lg space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D23] border border-[#2B3038] text-[#3B82F6] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">WAPDA / PEC Compliance</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Certified Net-Metering inverters and pure copper test laboratory reports provided with every commercial order.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#111318] rounded-3xl p-6 sm:p-10 border border-[#2B3038] shadow-xl text-white">
          {submittedId ? (
            <div className="p-8 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Inquiry Received!</h2>
              <p className="text-xs text-[#E5E7EB] leading-relaxed">
                Your quotation reference number is <strong className="font-mono text-[#3B82F6]">{submittedId}</strong>. Our senior commercial project manager will connect with you within 24 business hours.
              </p>
              <div className="pt-2">
                <a
                  href={`https://wa.me/${(settings?.whatsappNumber || '923001234567').replace(/[^0-9]/g, '')}?text=Hello%20M.A.%20Group,%20inquiring%20about%20Quotation%20${submittedId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Immediate Assistance on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-[#1A1D23] pb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Request Commercial Project Quotation
                </h2>
                <p className="text-xs text-[#6B7280] mt-1">
                  Please provide your project specifications to receive our formal invoice &amp; price schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">Company / Firm / Contractor Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Al-Madina Solar Solutions / Tariq Builders"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Engr. Asim Raza"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">
                    Mobile / WhatsApp Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0300 1234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="procurement@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">Project Location (City)</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lahore / Islamabad / Karachi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#E5E7EB]">Category of Interest</label>
                  <select
                    value={formData.categoryInterest}
                    onChange={(e) => setFormData({ ...formData, categoryInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB] cursor-pointer"
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#E5E7EB]">
                  Project Scope &amp; Bill of Quantities (BOQ) Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.projectDetails}
                  onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                  placeholder="Mention quantities, inverter capacities, cable coil gauges, delivery timeline, or architectural specs..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2B3038] bg-[#0B0D10] text-xs text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
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
