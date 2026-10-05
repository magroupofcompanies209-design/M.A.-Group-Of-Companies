import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import type { SolutionPackage, SolutionType, B2BInquiry } from '../types';
import { safeJsonResponse } from '../utils/api';
import { upsertQuotationRequestInSupabase } from '../lib/supabaseClient';
import {
  Cpu,
  CheckCircle2,
  ShoppingBag,
  FileText,
  Search,
  Copy,
  ArrowRight,
  Sparkles,
  Building2,
  Layers,
  ShieldCheck,
} from 'lucide-react';

const SOLUTION_CATEGORIES: SolutionType[] = [
  'Solar Solution',
  'Electrical House Wiring Solution',
  'Bathroom Sanitary Solution',
  'Kitchen Appliance Solution',
  'EV Charging Solution',
  'Hardware & Tools Package',
  'Commercial / Project Solution',
];

export const BuildSolutionPage: React.FC = () => {
  const {
    visibleSolutions,
    visibleProducts,
    addToCart,
    showToast,
    customerAccount,
    setIsCartDrawerOpen,
  } = useStore();

  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedProperty, setSelectedProperty] = useState<string>('All');
  const [selectedBudget, setSelectedBudget] = useState<string>('All');
  const [activePackage, setActivePackage] = useState<SolutionPackage | null>(null);

  // Custom Quote Request Modal / Form State
  const [quoteModalPkg, setQuoteModalPkg] = useState<SolutionPackage | null>(null);
  const [customQuoteMode, setCustomQuoteMode] = useState(false);
  const [contactPerson, setContactPerson] = useState(customerAccount?.fullName || '');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState(customerAccount?.phone || '');
  const [email, setEmail] = useState(customerAccount?.email || '');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('Home (10 Marla)');
  const [budgetRange, setBudgetRange] = useState('Standard');
  const [notes, setNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<B2BInquiry | null>(null);

  // Quote Tracking Lookup State
  const [trackCodeInput, setTrackCodeInput] = useState('');
  const [trackedQuote, setTrackedQuote] = useState<B2BInquiry | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const filteredSolutions = visibleSolutions.filter((pkg) => {
    if (selectedType !== 'All' && pkg.solutionType !== selectedType) return false;
    if (
      selectedProperty !== 'All' &&
      (pkg.targetPropertyType || '').toLowerCase() !== selectedProperty.toLowerCase()
    )
      return false;
    if (selectedBudget !== 'All' && pkg.budgetTier !== selectedBudget) return false;
    return true;
  });

  const handleAddAllToCart = (pkg: SolutionPackage) => {
    const linked = visibleProducts.filter((p) => (pkg.recommendedProducts || []).includes(p.id));
    if (linked.length === 0) {
      showToast(
        'Please request a custom quotation for this turnkey solution package.',
        'info'
      );
      setQuoteModalPkg(pkg);
      return;
    }
    linked.forEach((prod) => addToCart(prod, 1));
    showToast(`Added ${linked.length} package items from "${pkg.name}" to your cart!`, 'success');
    setIsCartDrawerOpen(true);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactPerson.trim() || !phone.trim()) {
      showToast('Please enter your name and phone number.', 'error');
      return;
    }
    setSubmittingQuote(true);
    try {
      const linkedNames = quoteModalPkg
        ? visibleProducts
            .filter((p) => (quoteModalPkg.recommendedProducts || []).includes(p.id))
            .map((p) => `${p.name} (${p.sku})`)
            .join(', ')
        : 'Custom Configured Solution';

      const payload = {
        companyName: companyName.trim() || 'Private Residence / Project',
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim() || customerAccount?.email || 'client@magroup.com.pk',
        city: city.trim() || 'Lahore',
        solutionType: quoteModalPkg?.solutionType || (selectedType !== 'All' ? selectedType : 'Solar Solution'),
        propertyType,
        estimatedQuantity: quoteModalPkg
          ? `${quoteModalPkg.name} (${quoteModalPkg.budgetTier} Tier)`
          : `Budget Tier: ${budgetRange}`,
        productsRequired: quoteModalPkg
          ? `Package: ${quoteModalPkg.name} | Est. PKR ${(quoteModalPkg.estimatedMinPrice || 0).toLocaleString()} - ${(quoteModalPkg.estimatedMaxPrice || 0).toLocaleString()} | Products: ${linkedNames}`
          : notes.trim() || 'Custom Turnkey Engineering Solution',
        notes: notes.trim(),
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
          `Quotation submitted! Tracking Code: ${created.quoteTrackingCode}`,
          'success'
        );
        setQuoteModalPkg(null);
        setCustomQuoteMode(false);
      } else {
        showToast('Failed to submit quotation request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error submitting quotation.', 'error');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleTrackQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCodeInput.trim()) return;
    setTrackLoading(true);
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
          data?.error || 'No quotation found with that Quote Tracking Code. Example: MA-QUOTE-2026-1001'
        );
      }
    } catch {
      setTrackError('Unable to verify Quote Tracking Code right now.');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] min-h-screen">
      {/* Luxury Header Banner */}
      <section className="bg-[#0D0E10] text-[#FCFBF8] py-14 sm:py-20 border-b border-[#C9B27C]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] text-[11px] font-semibold uppercase tracking-[0.2em]">
              <Cpu className="w-3.5 h-3.5" />
              <span>M.A. GROUP — TURNKEY ENGINEERING CONFIGURATOR</span>
            </div>
            <h1 className="font-luxury-serif text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
              Build Your Complete Solution
            </h1>
            <p className="text-sm sm:text-base text-[#B8B9BC] leading-relaxed max-w-2xl">
              Select your property type, load capacity, and budget tier to explore engineer-verified Solar, Electrical House Wiring, Luxury Sanitary, Kitchen, and EV Charging packages—or request a custom project quotation with a permanent Quote Tracking Code.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuoteModalPkg(null);
                  setCustomQuoteMode(true);
                }}
                className="px-6 py-3.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-[0.15em] cursor-pointer transition-all shadow-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Request Custom Project Quote</span>
              </button>
            </div>
          </div>

          {/* Instant Quote Tracking Box */}
          <div className="lg:col-span-5 bg-[#151C2C] border border-[#C9B27C]/40 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C9B27C]">
                Track Your Quotation Status
              </span>
              <span className="text-[10px] font-mono text-[#B8B9BC]">MA-QUOTE-2026-XXXX</span>
            </div>
            <form onSubmit={handleTrackQuote} className="flex gap-2">
              <input
                type="text"
                value={trackCodeInput}
                onChange={(e) => setTrackCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Quote Code (e.g. MA-QUOTE-2026-1001)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/35 text-xs font-mono text-[#FCFBF8] placeholder:text-[#B8B9BC]/50"
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="px-4 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{trackLoading ? '...' : 'Track'}</span>
              </button>
            </form>

            {trackError && <p className="text-xs text-rose-400">{trackError}</p>}

            {trackedQuote && (
              <div className="p-4 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#C9B27C]">
                    {trackedQuote.quoteTrackingCode || trackedQuote.id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                    {trackedQuote.status}
                  </span>
                </div>
                <div className="text-[#FCFBF8] font-semibold">
                  {trackedQuote.contactPerson} — {trackedQuote.companyName}
                </div>
                <div className="text-[11px] text-[#B8B9BC] line-clamp-2">
                  {trackedQuote.productsRequired}
                </div>
                {trackedQuote.adminNotes && (
                  <div className="p-2 rounded bg-[#151C2C] text-[#C9B27C] text-[11px]">
                    Engineer Note: {trackedQuote.adminNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Permanent Quote Tracking Code Confirmation Banner */}
      {submittedQuote && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#151C2C] text-[#FCFBF8] border-2 border-[#C9B27C] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Quotation Request Registered in Supabase</span>
              </div>
              <h2 className="font-luxury-serif text-2xl font-semibold">
                Your Permanent Quote Tracking Code:{' '}
                <span className="text-[#C9B27C] font-mono">
                  {submittedQuote.quoteTrackingCode}
                </span>
              </h2>
              <p className="text-xs text-[#B8B9BC] max-w-2xl">
                Save this tracking code. It is permanently stored in our database and remains unchanged across page refreshes, logins, and deployments. You can also view it anytime in your Customer Account or Track Order page.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(submittedQuote.quoteTrackingCode || '');
                  showToast('Quote Tracking Code copied to clipboard!', 'info');
                }}
                className="px-5 py-3 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Tracking Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Solution Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#B8B9BC]/40 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Solution Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A98B52] mb-2">
                1. Select Solution Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-xs font-semibold text-[#0D0E10]"
              >
                <option value="All">All Turnkey Solutions ({visibleSolutions.length})</option>
                {SOLUTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Property Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A98B52] mb-2">
                2. Select Property / Project Type
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-xs font-semibold text-[#0D0E10]"
              >
                <option value="All">All Property Sizes (5 Marla – Commercial)</option>
                <option value="Home">Home / Residence</option>
                <option value="Apartment">Luxury Apartment</option>
                <option value="Office">Corporate Office</option>
                <option value="Commercial Building">Commercial / Industrial</option>
              </select>
            </div>

            {/* Step 3: Budget Tier */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A98B52] mb-2">
                3. Select Budget &amp; Spec Tier
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['All', 'Economy', 'Standard', 'Luxury'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedBudget(tier)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedBudget === tier
                        ? 'bg-[#151C2C] text-[#C9B27C] border-[#C9B27C]'
                        : 'bg-[#F7F3EA] text-[#292B30] border-[#B8B9BC]/40 hover:border-[#C9B27C]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Solution Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {filteredSolutions.map((pkg) => {
            const linkedProducts = visibleProducts.filter((p) =>
              (pkg.recommendedProducts || []).includes(p.id)
            );
            return (
              <div
                key={pkg.id}
                className="rounded-2xl bg-[#FCFBF8] border border-[#B8B9BC]/45 hover:border-[#C9B27C] transition-all overflow-hidden flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="relative h-56 bg-[#0D0E10] overflow-hidden">
                    {pkg.image && (
                      <img
                        src={pkg.image}
                        alt={pkg.name}
                        className="w-full h-full object-cover opacity-90"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10] via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-lg bg-[#151C2C]/95 border border-[#C9B27C]/50 text-[#C9B27C] text-[10px] font-bold uppercase tracking-wider">
                        {pkg.solutionType}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-[#C9B27C] text-[#0D0E10] text-[10px] font-black uppercase tracking-wider">
                        {pkg.budgetTier} Tier
                      </span>
                    </div>
                    {pkg.packageDiscount ? (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-emerald-500 text-neutral-950 text-[10px] font-black uppercase">
                        Bundle Save {pkg.packageDiscount}%
                      </div>
                    ) : null}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-[#FCFBF8]">
                      <div>
                        <div className="text-[11px] text-[#C9B27C] font-semibold">
                          {pkg.targetPropertyType} • {pkg.propertySize}
                        </div>
                        <h3 className="font-luxury-serif text-xl sm:text-2xl font-semibold">
                          {pkg.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#B8B9BC]/30">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#292B30]/60">
                          Estimated Turnkey Investment
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-[#0D0E10] font-mono">
                          PKR {(pkg.estimatedMinPrice || 0).toLocaleString()} –{' '}
                          {(pkg.estimatedMaxPrice || 0).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePackage(activePackage?.id === pkg.id ? null : pkg)
                        }
                        className="text-xs font-semibold text-[#A98B52] hover:text-[#0D0E10] underline cursor-pointer"
                      >
                        {activePackage?.id === pkg.id ? 'Hide Full Specs' : 'View Full Specs'}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-[#292B30]/80 leading-relaxed">
                      {pkg.description}
                    </p>

                    {/* Included Components */}
                    {(pkg.includesList || []).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#0D0E10]">
                          What&apos;s Included in This Package:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(pkg.includesList || []).map((inc, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs text-[#292B30] bg-[#F7F3EA] px-3 py-2 rounded-lg border border-[#B8B9BC]/30"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#A98B52] shrink-0" />
                              <span className="truncate">{inc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expanded Specifications & Linked Products */}
                    {activePackage?.id === pkg.id && (
                      <div className="p-4 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/40 space-y-4 animate-in fade-in duration-200">
                        {pkg.specifications && Object.keys(pkg.specifications).length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase text-[#0D0E10]">
                              Engineering Specifications
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(pkg.specifications).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="p-2 rounded bg-[#FCFBF8] border border-[#B8B9BC]/30"
                                >
                                  <span className="text-[#292B30]/60 block text-[10px]">{k}</span>
                                  <span className="font-semibold text-[#0D0E10]">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {linkedProducts.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase text-[#0D0E10]">
                              Recommended Catalog Equipment ({linkedProducts.length})
                            </div>
                            <div className="space-y-2">
                              {linkedProducts.map((prod) => (
                                <div
                                  key={prod.id}
                                  className="p-2.5 rounded-lg bg-[#FCFBF8] border border-[#B8B9BC]/35 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={prod.images[0]}
                                      alt={prod.name}
                                      className="w-10 h-10 rounded object-cover shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-[#0D0E10] truncate">
                                        {prod.name}
                                      </div>
                                      <div className="text-[10px] text-[#A98B52] font-mono">
                                        PKR {(prod.salePrice || prod.price).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addToCart(prod, 1)}
                                    className="px-3 py-1.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-[11px] font-semibold shrink-0 cursor-pointer"
                                  >
                                    + Add Item
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Actions */}
                <div className="px-6 py-4 bg-[#F7F3EA] border-t border-[#B8B9BC]/35 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddAllToCart(pkg)}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add Package Products to Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteModalPkg(pkg);
                      setPropertyType(`${pkg.targetPropertyType || 'Home'} (${pkg.propertySize || ''})`);
                      setBudgetRange(pkg.budgetTier || 'Standard');
                    }}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#FCFBF8] hover:bg-[#C9B27C]/20 text-[#0D0E10] border border-[#C9B27C] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#A98B52]" />
                    <span>Request Custom Quote</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Request Quote Modal */}
      {(quoteModalPkg || customQuoteMode) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FCFBF8] border border-[#C9B27C] rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 text-[#292B30] shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-[#B8B9BC]/40">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A98B52]">
                  OFFICIAL ENGINEERING QUOTATION
                </span>
                <h3 className="font-luxury-serif text-xl font-semibold text-[#0D0E10] mt-0.5">
                  {quoteModalPkg
                    ? `Request Quote: ${quoteModalPkg.name}`
                    : 'Request Custom Turnkey Solution Quote'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuoteModalPkg(null);
                  setCustomQuoteMode(false);
                }}
                className="text-xs font-bold text-[#292B30]/60 hover:text-[#0D0E10] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="Engr. Tariq Mahmood"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="0300-1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    City / Site Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="DHA Phase 6, Lahore"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    Property / Project Size
                  </label>
                  <input
                    type="text"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="10 Marla / 1 Kanal / Commercial"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                    Company / Project Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                    placeholder="Private Residence or Company"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0D0E10] uppercase mb-1">
                  Custom Load / Equipment Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/60 text-[#0D0E10]"
                  placeholder="Specify number of ACs, rooms, bathrooms, or custom brand preferences..."
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/50 text-[11px] text-[#292B30]/80">
                Upon submission, you will receive an official{' '}
                <strong className="text-[#0D0E10]">Permanent Quote Tracking Code</strong> (e.g.{' '}
                <code className="font-mono text-[#A98B52]">MA-QUOTE-2026-XXXX</code>) synced with Supabase.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuoteModalPkg(null);
                    setCustomQuoteMode(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#F7F3EA] text-[#292B30] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="px-6 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  {submittingQuote ? 'Generating Quote Code...' : 'Submit & Get Tracking Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
