import React, { useState, useRef } from 'react';
import type { Brand, Category } from '../types/index.ts';
import {
  insertOrUpdatePartnerInSupabase,
  deletePartnerInSupabase,
  uploadImageDirectlyToSupabaseStorage,
} from '../lib/supabaseClient.ts';
import { safeJsonResponse } from '../utils/api.ts';
import {
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Globe,
  MapPin,
  Award,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PartnersTabProps {
  partners: Brand[];
  categories: Category[];
  adminToken: string;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PartnersTab: React.FC<PartnersTabProps> = ({
  partners,
  categories,
  adminToken,
  onRefresh,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Brand | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    logoUrl: '',
    description: '',
    country: 'Pakistan',
    websiteUrl: '',
    certification: '',
    categories: [] as string[],
    partnerStatus: 'Authorized Partner',
    displayOrder: 1,
    isVisible: true,
  });

  const getAdminHeaders = (includeJson = true): Record<string, string> => {
    const h: Record<string, string> = {};
    if (includeJson) h['Content-Type'] = 'application/json';
    if (adminToken) {
      h['x-admin-token'] = adminToken;
      h['Authorization'] = `Bearer ${adminToken}`;
    }
    return h;
  };

  const handleOpenAddModal = () => {
    setEditingPartner(null);
    setForm({
      name: '',
      logoUrl: '',
      description: '',
      country: 'Pakistan',
      websiteUrl: '',
      certification: 'ISO 9001 Certified Partner',
      categories: [],
      partnerStatus: 'Authorized Partner',
      displayOrder: partners.length + 1,
      isVisible: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (partner: Brand) => {
    setEditingPartner(partner);
    setForm({
      name: partner.name || '',
      logoUrl: partner.logoUrl || partner.logo_url || '',
      description: partner.description || '',
      country: partner.country || 'Pakistan',
      websiteUrl: partner.websiteUrl || partner.website_url || '',
      certification: partner.certification || '',
      categories: Array.isArray(partner.categories) ? partner.categories : [],
      partnerStatus: partner.partnerStatus || 'Authorized Partner',
      displayOrder: Number(partner.displayOrder ?? 1),
      isVisible: partner.isVisible !== false,
    });
    setIsModalOpen(true);
  };

  const handleToggleCategory = (categoryName: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(categoryName);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== categoryName)
          : [...prev.categories, categoryName],
      };
    });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      // 1. Try direct Supabase Storage upload first
      const directRes = await uploadImageDirectlyToSupabaseStorage(file);
      if (directRes.ok && directRes.publicUrl) {
        setForm((prev) => ({ ...prev, logoUrl: directRes.publicUrl! }));
        showToast('Partner logo uploaded to Supabase Storage.', 'success');
        return;
      }

      // 2. Fallback: convert to base64 and upload via /api/upload or use data URI directly
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed reading logo file'));
        reader.readAsDataURL(file);
      });

      try {
        const apiRes = await fetch('/api/upload', {
          method: 'POST',
          headers: getAdminHeaders(true),
          body: JSON.stringify({
            filename: `partner-${Date.now()}-${file.name}`,
            fileData: dataUrl,
            contentType: file.type || 'image/png',
          }),
        });
        const apiData = await safeJsonResponse(apiRes, null);
        if (apiRes.ok && apiData?.url) {
          setForm((prev) => ({ ...prev, logoUrl: apiData.url }));
          showToast('Partner logo uploaded.', 'success');
          return;
        }
      } catch {
        // Fall through to dataUrl
      }

      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      showToast('Partner logo selected from device.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload partner logo.', 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Partner/Manufacturer Name is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const id = editingPartner ? editingPartner.id : `partner-${Date.now()}`;
      const partnerPayload: Brand = {
        id,
        name: form.name.trim(),
        slug: form.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        logoUrl: form.logoUrl.trim(),
        logo_url: form.logoUrl.trim(),
        description: form.description.trim(),
        country: form.country.trim() || 'Pakistan',
        websiteUrl: form.websiteUrl.trim(),
        website_url: form.websiteUrl.trim(),
        certification: form.certification.trim(),
        categories: form.categories,
        partnerStatus: form.partnerStatus.trim() || 'Authorized Partner',
        displayOrder: Number(form.displayOrder) || 1,
        isVisible: form.isVisible,
        isFeatured: form.isVisible,
        createdAt: editingPartner?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Sync to Supabase directly if configured
      await insertOrUpdatePartnerInSupabase(partnerPayload, partners).catch(() => {});

      // Sync to backend API (which also persists to Supabase using service-role key)
      const endpoint = editingPartner ? `/api/partners/${id}` : '/api/partners';
      const method = editingPartner ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: getAdminHeaders(true),
        body: JSON.stringify(partnerPayload),
      });

      if (!res.ok) {
        const errData = await safeJsonResponse(res, { error: 'Failed to save partner.' });
        throw new Error(errData.error || 'Failed to save manufacturing partner.');
      }

      await onRefresh();
      setIsModalOpen(false);
      setEditingPartner(null);
      showToast(
        editingPartner
          ? `Updated manufacturing partner "${partnerPayload.name}".`
          : `Added manufacturing partner "${partnerPayload.name}".`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to save manufacturing partner.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (partner: Brand) => {
    const nextVis = partner.isVisible === false ? true : false;
    try {
      const updatedPartner: Brand = {
        ...partner,
        isVisible: nextVis,
        updatedAt: new Date().toISOString(),
      };
      await insertOrUpdatePartnerInSupabase(updatedPartner, partners).catch(() => {});
      const res = await fetch(`/api/partners/${partner.id}/visibility`, {
        method: 'PATCH',
        headers: getAdminHeaders(true),
        body: JSON.stringify({ isVisible: nextVis, is_visible: nextVis }),
      });
      if (!res.ok) {
        throw new Error('Failed to update partner visibility.');
      }
      await onRefresh();
      showToast(
        `"${partner.name}" is now ${nextVis ? 'Visible on Storefront' : 'Hidden from Storefront'}.`,
        'info'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed updating visibility.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!partnerToDelete) return;
    setIsDeleting(true);
    try {
      await deletePartnerInSupabase(partnerToDelete.id, partners).catch(() => {});
      const res = await fetch(`/api/partners/${partnerToDelete.id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(false),
      });
      if (!res.ok) {
        throw new Error('Failed to delete manufacturing partner.');
      }
      const deletedName = partnerToDelete.name;
      setPartnerToDelete(null);
      await onRefresh();
      showToast(`Manufacturing partner "${deletedName}" deleted permanently.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete partner.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPartners = partners
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.country || '').toLowerCase().includes(q) ||
        (p.certification || '').toLowerCase().includes(q) ||
        (p.categories || []).some((c) => c.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const visibleCount = partners.filter((p) => p.isVisible !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151C2C]/60 p-6 rounded-2xl border border-[#C9B27C]/30">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9B27C] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Supabase Synchronized Brand Registry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-luxury-serif font-semibold text-[#FCFBF8] mt-1">
            Certified Manufacturing Partners
          </h2>
          <p className="text-xs text-[#B8B9BC] mt-1">
            Manage trusted manufacturers and brands displayed on the M.A. GROUP OF COMPANIES storefront ({visibleCount} visible of {partners.length} total).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manufacturing Partner</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partners by name, country, certification, or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
          />
        </div>
        <div className="text-xs text-neutral-400">
          Changes automatically sync with Supabase &amp; Customer Storefront
        </div>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredPartners.map((partner) => {
          const isVis = partner.isVisible !== false;
          const logoSrc = partner.logoUrl || partner.logo_url || '';
          const website = partner.websiteUrl || partner.website_url || '';

          return (
            <div
              key={partner.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isVis
                  ? 'bg-neutral-900 border-neutral-800 hover:border-[#C9B27C]/50'
                  : 'bg-neutral-950/70 border-neutral-800/60 opacity-75'
              }`}
            >
              <div>
                {/* Top Bar: Logo + Visibility Switch */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-[#FCFBF8] border border-[#C9B27C]/40 flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={partner.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="font-luxury-serif font-bold text-sm text-[#151C2C]">
                          {partner.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#C9B27C]">
                          Order #{partner.displayOrder ?? 1}
                        </span>
                        <span className="text-neutral-600">&middot;</span>
                        <span className="text-[10px] text-neutral-400 truncate">
                          {partner.partnerStatus || 'Authorized Partner'}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base truncate mt-0.5">
                        {partner.name}
                      </h3>
                      {partner.country && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#C9B27C]" />
                          <span>{partner.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visibility ON/OFF Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(partner)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
                      isVis
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                    title="Toggle Storefront Visibility ON/OFF"
                  >
                    {isVis ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                {partner.description && (
                  <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 mb-3">
                    {partner.description}
                  </p>
                )}

                {/* Certification */}
                {partner.certification && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#C9B27C] mb-2">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{partner.certification}</span>
                  </div>
                )}

                {/* Categories */}
                {Array.isArray(partner.categories) && partner.categories.length > 0 && (
                  <div className="text-[11px] text-neutral-400 mb-3">
                    <span className="text-neutral-500 font-semibold">Categories: </span>
                    {partner.categories.join(' · ')}
                  </div>
                )}

                {/* Website */}
                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline mb-2"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[220px]">{website}</span>
                  </a>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(partner)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#C9B27C]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerToDelete(partner)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT PARTNER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-[#C9B27C]/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingPartner ? 'Edit Manufacturing Partner' : 'Add Manufacturing Partner'}
                </h3>
                <p className="text-xs text-neutral-400">
                  Saved directly to Supabase and synchronized with the public storefront.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Partner / Manufacturer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Schneider Electric"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="e.g. Germany, France, Pakistan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>
              </div>

              {/* Logo Upload & Preview */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <label className="block text-xs font-bold text-neutral-300">
                  Partner / Manufacturer Logo
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#FCFBF8] border border-[#C9B27C]/40 flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold text-[#151C2C]">LOGO</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isUploadingLogo ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isUploadingLogo ? 'Uploading...' : 'Upload Logo from Device'}
                        </span>
                      </button>
                      {form.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, logoUrl: '' })}
                          className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="Or paste logo image URL (optional)"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief overview of the manufacturer and partnership scope..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Website URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.websiteUrl}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    placeholder="https://www.manufacturer.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Certification / Quality Standard
                  </label>
                  <input
                    type="text"
                    value={form.certification}
                    onChange={(e) => setForm({ ...form, certification: e.target.value })}
                    placeholder="e.g. ISO 9001 & IEC Tier-1 Certified"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Partner Status Title
                  </label>
                  <input
                    type="text"
                    value={form.partnerStatus}
                    onChange={(e) => setForm({ ...form, partnerStatus: e.target.value })}
                    placeholder="Authorized Partner"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Storefront Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isVisible: !form.isVisible })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      form.isVisible
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {form.isVisible ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Visibility: ON (Visible)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Visibility: OFF (Hidden)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Related Product Categories */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Related Product Categories
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  {categories.map((cat) => {
                    const checked = form.categories.includes(cat.name);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                          checked
                            ? 'bg-[#151C2C] border-[#C9B27C]/50 text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCategory(cat.name)}
                          className="accent-[#C9B27C]"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editingPartner ? 'Save Partner Changes' : 'Add Partner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {partnerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">
                Delete this manufacturing partner?
              </h3>
              <p className="text-xs text-neutral-400">
                You are about to permanently remove{' '}
                <span className="text-white font-semibold">&ldquo;{partnerToDelete.name}&rdquo;</span>{' '}
                from Supabase and the customer storefront.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPartnerToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
