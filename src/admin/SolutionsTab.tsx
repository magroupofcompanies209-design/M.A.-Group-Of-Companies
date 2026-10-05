import React, { useState, useEffect } from 'react';
import type { SolutionPackage, SolutionType, Product, Category, B2BInquiry } from '../types/index.ts';
import {
  upsertSolutionPackageInSupabase,
  deleteSolutionPackageFromSupabase,
  upsertQuotationRequestInSupabase,
} from '../lib/supabaseClient.ts';
import { safeJsonResponse } from '../utils/api.ts';
import {
  Cpu,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  AlertTriangle,
  X,
  Copy,
  FileText,
} from 'lucide-react';

interface SolutionsTabProps {
  solutionPackages: SolutionPackage[];
  products: Product[];
  categories: Category[];
  onRefreshSolutions: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SOLUTION_TYPES: SolutionType[] = [
  'Solar Solution',
  'Electrical House Wiring Solution',
  'Bathroom Sanitary Solution',
  'Kitchen Appliance Solution',
  'EV Charging Solution',
  'Hardware & Tools Package',
  'Commercial / Project Solution',
];

export const SolutionsTab: React.FC<SolutionsTabProps> = ({
  solutionPackages,
  products,
  onRefreshSolutions,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'packages' | 'quotations'>('packages');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<SolutionPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SolutionPackage | null>(null);
  const [saving, setSaving] = useState(false);

  // Solution Package Form State
  const [name, setName] = useState('');
  const [solutionType, setSolutionType] = useState<SolutionType>('Solar Solution');
  const [targetPropertyType, setTargetPropertyType] = useState('Home');
  const [propertySize, setPropertySize] = useState('10 Marla');
  const [budgetTier, setBudgetTier] = useState<'Economy' | 'Standard' | 'Luxury'>('Standard');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [recommendedProducts, setRecommendedProducts] = useState<string[]>([]);
  const [estimatedMinPrice, setEstimatedMinPrice] = useState<number>(450000);
  const [estimatedMaxPrice, setEstimatedMaxPrice] = useState<number>(650000);
  const [packageDiscount, setPackageDiscount] = useState<number>(5);
  const [includesText, setIncludesText] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isVisible, setIsVisible] = useState(true);

  // Quotations / Custom Solution Requests
  const [quotations, setQuotations] = useState<B2BInquiry[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const fetchQuotations = async () => {
    setLoadingQuotes(true);
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const res = await fetch(`/api/b2b?_t=${Date.now()}`, {
        headers: {
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await safeJsonResponse(res, []);
      if (Array.isArray(data)) setQuotations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const openAddModal = () => {
    setEditingPkg(null);
    setName('');
    setSolutionType('Solar Solution');
    setTargetPropertyType('Home');
    setPropertySize('10 Marla');
    setBudgetTier('Luxury');
    setDescription('');
    setImage(
      'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=85'
    );
    setRecommendedProducts([]);
    setEstimatedMinPrice(850000);
    setEstimatedMaxPrice(1250000);
    setPackageDiscount(5);
    setIncludesText(
      'Tier-1 N-Type Bifacial Solar Panels\nHybrid IP65 Smart Inverter\nLiFePO4 Lithium Battery Bank\nPure Copper DC Cabling & Breakers'
    );
    setSpecsText('System Capacity: 10kW Hybrid\nDaily Generation: 40-45 Units\nWarranty: 10 Years');
    setDisplayOrder(solutionPackages.length + 1);
    setIsVisible(true);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: SolutionPackage) => {
    setEditingPkg(pkg);
    setName(pkg.name || '');
    setSolutionType(pkg.solutionType || 'Solar Solution');
    setTargetPropertyType(pkg.targetPropertyType || 'Home');
    setPropertySize(pkg.propertySize || '10 Marla');
    setBudgetTier(pkg.budgetTier || 'Standard');
    setDescription(pkg.description || '');
    setImage(pkg.image || '');
    setRecommendedProducts(pkg.recommendedProducts || []);
    setEstimatedMinPrice(pkg.estimatedMinPrice || 0);
    setEstimatedMaxPrice(pkg.estimatedMaxPrice || 0);
    setPackageDiscount(pkg.packageDiscount || 0);
    setIncludesText((pkg.includesList || []).join('\n'));
    setSpecsText(
      Object.entries(pkg.specifications || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    );
    setDisplayOrder(pkg.displayOrder ?? 1);
    setIsVisible(pkg.isVisible !== false);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
        showToast('Package image uploaded.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Package name is required.', 'error');
      return;
    }
    setSaving(true);
    const parsedSpecs: Record<string, string> = {};
    specsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [k, ...rest] = line.split(':');
        if (k && rest.length) {
          parsedSpecs[k.trim()] = rest.join(':').trim();
        }
      });

    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `sol-${Date.now()}`;

    const payload: SolutionPackage = {
      id: editingPkg?.id || `sol-${Date.now()}`,
      name: name.trim(),
      slug,
      solutionType,
      targetPropertyType,
      propertySize,
      budgetTier,
      description: description.trim(),
      image: image.trim(),
      recommendedProducts,
      estimatedMinPrice: Number(estimatedMinPrice) || 0,
      estimatedMaxPrice: Number(estimatedMaxPrice) || 0,
      packageDiscount: Number(packageDiscount) || 0,
      includesList: includesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      specifications: parsedSpecs,
      displayOrder: Number(displayOrder) || 1,
      isVisible,
      createdAt: editingPkg?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const url = editingPkg ? `/api/solutions/${editingPkg.id}` : '/api/solutions';
      const method = editingPkg ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const saved = await safeJsonResponse(res, payload);
      await upsertSolutionPackageInSupabase(saved.id ? saved : payload);
      await onRefreshSolutions();
      showToast(editingPkg ? 'Solution package updated!' : 'Solution package created!', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save solution package.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (pkg: SolutionPackage) => {
    const updated: SolutionPackage = {
      ...pkg,
      isVisible: !pkg.isVisible,
      updatedAt: new Date().toISOString(),
    };
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/solutions/${pkg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      await upsertSolutionPackageInSupabase(updated);
      await onRefreshSolutions();
      showToast(
        `"${pkg.name}" is now ${updated.isVisible ? 'Visible on Storefront' : 'Hidden from Storefront'}.`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle visibility.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/solutions/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
      await deleteSolutionPackageFromSupabase(deleteTarget.id);
      await onRefreshSolutions();
      showToast(`Deleted "${deleteTarget.name}".`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete solution package.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuoteStatus = async (
    q: B2BInquiry,
    status: B2BInquiry['status'],
    adminNotes?: string
  ) => {
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const res = await fetch(`/api/b2b/${q.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, adminNotes: adminNotes ?? q.adminNotes }),
      });
      const updated = await safeJsonResponse(res, { ...q, status });
      await upsertQuotationRequestInSupabase(updated);
      await fetchQuotations();
      showToast(`Updated quote ${q.quoteTrackingCode || q.id} to ${status}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed updating quotation.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0D0E10] border border-[#C9B27C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C9B27C] text-xs font-bold uppercase tracking-[0.2em]">
            <Cpu className="w-4 h-4" />
            <span>INTERACTIVE SOLUTION CONFIGURATOR &amp; QUOTATIONS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-luxury-serif font-semibold text-[#FCFBF8]">
            Build Your Solution Packages &amp; Custom Quotes
          </h2>
          <p className="text-xs text-[#B8B9BC] max-w-2xl">
            Manage turnkey Solar, Electrical House Wiring, Bathroom Sanitary, Kitchen, EV Charging, and Commercial solution packages with permanent Quote Tracking Codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-[#151C2C] p-1 border border-[#C9B27C]/30">
            <button
              type="button"
              onClick={() => setSubTab('packages')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'packages'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Solution Packages ({solutionPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('quotations')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'quotations'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Quote Requests ({quotations.length})
            </button>
          </div>

          {subTab === 'packages' && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Solution Package</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'packages' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...solutionPackages]
            .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
            .map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                  pkg.isVisible !== false
                    ? 'bg-[#151C2C]/95 border-[#C9B27C]/35'
                    : 'bg-neutral-900/60 border-neutral-800 opacity-75'
                }`}
              >
                <div>
                  <div className="relative h-44 bg-[#0D0E10] overflow-hidden border-b border-[#C9B27C]/20">
                    {pkg.image ? (
                      <img
                        src={pkg.image}
                        alt={pkg.name}
                        className="w-full h-full object-cover opacity-85"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C9B27C]/30">
                        <Cpu className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#C9B27C] text-[#0D0E10] text-[10px] font-black uppercase">
                        {pkg.solutionType}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#0D0E10]/90 text-[#FCFBF8] text-[10px] font-mono">
                        {pkg.budgetTier}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(pkg)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer ${
                          pkg.isVisible !== false
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {pkg.isVisible !== false ? (
                          <>
                            <Eye className="w-3 h-3" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Hidden
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#C9B27C] font-semibold">
                      <span>
                        {pkg.targetPropertyType} • {pkg.propertySize}
                      </span>
                      {pkg.packageDiscount ? <span>Save {pkg.packageDiscount}%</span> : null}
                    </div>
                    <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-[#B8B9BC] line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>
                    <div className="pt-1 font-mono text-xs font-bold text-[#C9B27C]">
                      Est. PKR {(pkg.estimatedMinPrice || 0).toLocaleString()} –{' '}
                      {(pkg.estimatedMaxPrice || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#B8B9BC]">
                      {(pkg.recommendedProducts || []).length} Linked Catalog Products
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#0D0E10]/80 border-t border-[#C9B27C]/20 flex items-center justify-between">
                  <span className="text-[11px] text-[#B8B9BC] font-mono">
                    Order #{pkg.displayOrder ?? 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      className="px-3 py-1.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(pkg)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        /* Quotations & B2B Requests Table with Permanent Tracking Code */
        <div className="rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 overflow-hidden">
          <div className="p-4 bg-[#0D0E10] border-b border-[#C9B27C]/20 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C9B27C] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>B2B &amp; Custom Solution Quotation Requests (Permanent Tracking Codes)</span>
            </h3>
            <button
              type="button"
              onClick={fetchQuotations}
              className="px-3 py-1.5 rounded-lg bg-[#151C2C] border border-[#C9B27C]/30 text-xs text-[#FCFBF8] cursor-pointer"
            >
              {loadingQuotes ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0D0E10]/70 text-[#C9B27C] uppercase text-[11px] border-b border-[#C9B27C]/20">
                  <th className="p-4">Quote Tracking Code</th>
                  <th className="p-4">Client / Company</th>
                  <th className="p-4">Solution / Requirements</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9B27C]/15 text-[#FCFBF8]">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-[#0D0E10]/40">
                    <td className="p-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/45 font-mono font-bold text-[#C9B27C]">
                        <span>{q.quoteTrackingCode || q.id}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(q.quoteTrackingCode || q.id);
                            showToast(`Copied ${q.quoteTrackingCode || q.id}`, 'info');
                          }}
                          className="text-[#B8B9BC] hover:text-white cursor-pointer"
                          title="Copy Quote Tracking Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#FCFBF8]">{q.contactPerson}</div>
                      <div className="text-[11px] text-[#C9B27C]">{q.companyName}</div>
                      <div className="text-[11px] text-[#B8B9BC]">
                        {q.phone} • {q.email} {q.city ? `• ${q.city}` : ''}
                      </div>
                    </td>
                    <td className="p-4 max-w-md">
                      {q.solutionType && (
                        <span className="inline-block px-2 py-0.5 rounded bg-[#C9B27C]/20 text-[#C9B27C] text-[10px] font-bold mb-1">
                          {q.solutionType} {q.propertyType ? `(${q.propertyType})` : ''}
                        </span>
                      )}
                      <div className="text-[#FCFBF8] line-clamp-2">{q.productsRequired}</div>
                      {q.estimatedQuantity && (
                        <div className="text-[11px] text-[#B8B9BC] mt-0.5">
                          Scope/Qty: {q.estimatedQuantity}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-[#B8B9BC] font-mono">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#0D0E10] border border-[#C9B27C]/40 text-[#C9B27C]">
                        {q.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={q.status}
                        onChange={(e) =>
                          handleUpdateQuoteStatus(q, e.target.value as B2BInquiry['status'])
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/35 text-xs text-[#FCFBF8]"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Quotation Prepared">Quotation Prepared</option>
                        <option value="Sent to Customer">Sent to Customer</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Solution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151C2C] border border-[#C9B27C]/40 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-[#FCFBF8] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C9B27C]/25">
              <h3 className="text-lg font-luxury-serif font-semibold">
                {editingPkg ? `Edit Solution: ${editingPkg.name}` : 'Create Solution Package'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                    placeholder="10kW Hybrid Solar Residence Package"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Solution Type
                  </label>
                  <select
                    value={solutionType}
                    onChange={(e) => setSolutionType(e.target.value as SolutionType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  >
                    {SOLUTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Property Type
                  </label>
                  <select
                    value={targetPropertyType}
                    onChange={(e) => setTargetPropertyType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  >
                    <option value="Home">Home</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Office">Office</option>
                    <option value="Shop">Shop</option>
                    <option value="Commercial Building">Commercial Building</option>
                    <option value="Project / Contractor">Project / Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Property Size / Load
                  </label>
                  <input
                    type="text"
                    value={propertySize}
                    onChange={(e) => setPropertySize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                    placeholder="5 Marla / 10 Marla / 1 Kanal"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Budget Tier
                  </label>
                  <select
                    value={budgetTier}
                    onChange={(e) =>
                      setBudgetTier(e.target.value as 'Economy' | 'Standard' | 'Luxury')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  >
                    <option value="Economy">Economy</option>
                    <option value="Standard">Standard</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                  Executive Package Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Est. Min Price (PKR)
                  </label>
                  <input
                    type="number"
                    value={estimatedMinPrice}
                    onChange={(e) => setEstimatedMinPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Est. Max Price (PKR)
                  </label>
                  <input
                    type="number"
                    value={estimatedMaxPrice}
                    onChange={(e) => setEstimatedMaxPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Bundle Discount %
                  </label>
                  <input
                    type="number"
                    value={packageDiscount}
                    onChange={(e) => setPackageDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Included Components (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={includesText}
                    onChange={(e) => setIncludesText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Technical Specs (Key: Value per line)
                  </label>
                  <textarea
                    rows={3}
                    value={specsText}
                    onChange={(e) => setSpecsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#C9B27C] uppercase mb-1.5">
                  Recommended Catalog Products (Click to toggle inclusion in bundle)
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {products.map((prod) => {
                    const selected = recommendedProducts.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() =>
                          setRecommendedProducts((prev) =>
                            selected ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                          )
                        }
                        className={`p-2 rounded-lg text-left border text-[11px] flex items-center justify-between cursor-pointer ${
                          selected
                            ? 'bg-[#C9B27C]/20 border-[#C9B27C] text-[#FCFBF8]'
                            : 'bg-[#151C2C] border-transparent text-[#B8B9BC]'
                        }`}
                      >
                        <span className="truncate">{prod.name}</span>
                        <span className="font-mono text-[#C9B27C] shrink-0 ml-2">
                          PKR {(prod.salePrice || prod.price).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#C9B27C] uppercase">Image URL</label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/40 text-[#C9B27C] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span className="font-bold">Visible on Storefront (ON)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#C9B27C]/25 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold uppercase cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Solution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 text-[#FCFBF8]">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-luxury-serif font-semibold">Delete Solution Package?</h3>
            <p className="text-xs text-[#B8B9BC]">
              Remove <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> from the database?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0D0E10] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
