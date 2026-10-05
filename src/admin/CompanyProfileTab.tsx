import React, { useState } from 'react';
import type { CompanyPage, CompanyPageSection, StoreSettings } from '../types/index.ts';
import {
  upsertCompanyPageInSupabase,
  deleteCompanyPageFromSupabase,
  saveSettingsInSupabase,
} from '../lib/supabaseClient.ts';
import { safeJsonResponse } from '../utils/api.ts';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Layout,
  Sparkles,
  X,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';

interface CompanyProfileTabProps {
  companyPages: CompanyPage[];
  settings: StoreSettings | null;
  onRefreshPages: () => Promise<void>;
  onRefreshSettings: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  companyPages,
  settings,
  onRefreshPages,
  onRefreshSettings,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'pages' | 'homepage'>('pages');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CompanyPage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyPage | null>(null);
  const [saving, setSaving] = useState(false);

  // Page Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [content, setContent] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [sections, setSections] = useState<CompanyPageSection[]>([]);

  // Homepage Company Intro State
  const hpDefault = settings?.homepageCompanySection || {
    heading: 'Building Trust Through Quality',
    subheading: 'M.A. GROUP OF COMPANIES — CORPORATE HERITAGE',
    description:
      'For discerning homeowners, architects, and industrial contractors across Pakistan, M.A. Group delivers certified Tier-1 solar energy, 99.99% pure copper electrical engineering, luxury sanitary fittings, and custom technical solutions.',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    buttonText: 'Learn About Us',
    buttonLink: 'company/about-ma-group',
    isVisible: true,
    displayOrder: 1,
    highlights: [
      'ISO & PEC Compliant Engineering Standards',
      'Direct Authorized Partnerships with Global Brands',
      'Nationwide Cash on Delivery & Project Logistics',
    ],
  };

  const [hpHeading, setHpHeading] = useState(hpDefault.heading);
  const [hpSubheading, setHpSubheading] = useState(hpDefault.subheading || 'M.A. GROUP OF COMPANIES');
  const [hpDescription, setHpDescription] = useState(hpDefault.description);
  const [hpImage, setHpImage] = useState(hpDefault.image);
  const [hpButtonText, setHpButtonText] = useState(hpDefault.buttonText);
  const [hpButtonLink, setHpButtonLink] = useState(hpDefault.buttonLink);
  const [hpVisible, setHpVisible] = useState(hpDefault.isVisible !== false);
  const [hpOrder, setHpOrder] = useState(hpDefault.displayOrder || 1);
  const [hpHighlights, setHpHighlights] = useState<string[]>(
    hpDefault.highlights || [
      'ISO & PEC Compliant Engineering Standards',
      'Direct Authorized Partnerships with Global Brands',
      'Nationwide Cash on Delivery & Project Logistics',
    ]
  );

  const sortedPages = [...companyPages].sort(
    (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
  );

  const openAddModal = () => {
    setEditingPage(null);
    setTitle('');
    setSlug('');
    setSubtitle('');
    setHeroImage(
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=85'
    );
    setContent('');
    setButtonText('Explore Catalog');
    setButtonLink('shop');
    setDisplayOrder(companyPages.length + 1);
    setIsVisible(true);
    setSections([]);
    setIsModalOpen(true);
  };

  const openEditModal = (page: CompanyPage) => {
    setEditingPage(page);
    setTitle(page.title || '');
    setSlug(page.slug || '');
    setSubtitle(page.subtitle || '');
    setHeroImage(page.heroImage || '');
    setContent(page.content || '');
    setButtonText(page.buttonText || '');
    setButtonLink(page.buttonLink || '');
    setDisplayOrder(page.displayOrder ?? 1);
    setIsVisible(page.isVisible !== false);
    setSections(
      Array.isArray(page.sections)
        ? [...page.sections].sort((a, b) => (a.displayOrder ?? 1) - (b.displayOrder ?? 1))
        : []
    );
    setIsModalOpen(true);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    cb: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Image exceeds 4MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        cb(reader.result);
        showToast('Image uploaded.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        heading: 'New Section Heading',
        subheading: 'CORPORATE EXCELLENCE',
        content: 'Describe this corporate pillar, engineering standard, or customer commitment...',
        image: '',
        buttonText: '',
        buttonLink: '',
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const updateSection = (idx: number, patch: Partial<CompanyPageSection>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveSection = (idx: number, dir: 'up' | 'down') => {
    setSections((prev) => {
      const copy = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((s, i) => ({ ...s, displayOrder: i + 1 }));
    });
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Page title is required.', 'error');
      return;
    }
    setSaving(true);
    const cleanSlug =
      (slug || title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `page-${Date.now()}`;

    const payload: CompanyPage = {
      id: editingPage?.id || `cp-${Date.now()}`,
      slug: cleanSlug,
      title: title.trim(),
      subtitle: subtitle.trim(),
      heroImage: heroImage.trim(),
      content: content.trim(),
      sections: sections.map((s, idx) => ({ ...s, displayOrder: idx + 1 })),
      buttonText: buttonText.trim(),
      buttonLink: buttonLink.trim(),
      displayOrder: Number(displayOrder) || 1,
      isVisible,
      createdAt: editingPage?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const url = editingPage ? `/api/company-pages/${editingPage.id}` : '/api/company-pages';
      const method = editingPage ? 'PUT' : 'POST';

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
      await upsertCompanyPageInSupabase(saved.id ? saved : payload);
      await onRefreshPages();
      showToast(
        editingPage ? `Updated "${payload.title}"` : `Created "${payload.title}"`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save company page.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (page: CompanyPage) => {
    const updated: CompanyPage = {
      ...page,
      isVisible: !page.isVisible,
      updatedAt: new Date().toISOString(),
    };
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/company-pages/${page.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      await upsertCompanyPageInSupabase(updated);
      await onRefreshPages();
      showToast(
        `"${page.title}" is now ${updated.isVisible ? 'Visible on Storefront' : 'Hidden from Storefront'}.`,
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
      await fetch(`/api/company-pages/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
      await deleteCompanyPageFromSupabase(deleteTarget.id);
      await onRefreshPages();
      showToast(`Deleted "${deleteTarget.title}".`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete page.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHomepageSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const updatedSettings: StoreSettings = {
      ...settings,
      homepageCompanySection: {
        heading: (hpHeading || '').trim(),
        subheading: (hpSubheading || '').trim(),
        description: (hpDescription || '').trim(),
        image: (hpImage || '').trim(),
        buttonText: (hpButtonText || '').trim(),
        buttonLink: (hpButtonLink || '').trim(),
        isVisible: hpVisible,
        displayOrder: Number(hpOrder) || 1,
        highlights: hpHighlights.filter((h) => h.trim().length > 0),
      },
    };
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedSettings),
      });
      await saveSettingsInSupabase(updatedSettings);
      await onRefreshSettings();
      showToast('Homepage Company Introduction saved to Supabase.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save homepage section.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0D0E10] border border-[#C9B27C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C9B27C] text-xs font-bold uppercase tracking-[0.2em]">
            <Building2 className="w-4 h-4" />
            <span>M.A. GROUP OF COMPANIES — CORPORATE PROFILE ENGINE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-luxury-serif font-semibold text-[#FCFBF8]">
            Premium Company Profile &amp; Heritage Pages
          </h2>
          <p className="text-xs text-[#B8B9BC] max-w-2xl">
            Manage all corporate storefront pages (About Us, Our Mission, Our Vision, Why Choose Us, Quality Assurance, Our Values, Our Services, Manufacturing Partners, Customer Support, Contact Us) and the Homepage Company Introduction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-[#151C2C] p-1 border border-[#C9B27C]/30">
            <button
              type="button"
              onClick={() => setSubTab('pages')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'pages'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Profile Pages ({companyPages.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('homepage')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'homepage'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Homepage Intro Section
            </button>
          </div>

          {subTab === 'pages' && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Profile Page</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'pages' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedPages.map((page) => (
            <div
              key={page.id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                page.isVisible !== false
                  ? 'bg-[#151C2C]/90 border-[#C9B27C]/30'
                  : 'bg-neutral-900/60 border-neutral-800 opacity-75'
              }`}
            >
              <div>
                <div className="relative h-40 bg-[#0D0E10] overflow-hidden border-b border-[#C9B27C]/20">
                  {page.heroImage ? (
                    <img
                      src={page.heroImage}
                      alt={page.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C9B27C]/40">
                      <FileText className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#0D0E10]/90 border border-[#C9B27C]/40 text-[#C9B27C] text-[10px] font-mono font-bold">
                      Order #{page.displayOrder ?? 1}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#0D0E10]/90 text-[#FCFBF8] text-[10px] font-mono">
                      /{page.slug}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(page)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                        page.isVisible !== false
                          ? 'bg-emerald-500/90 text-neutral-950'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {page.isVisible !== false ? (
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
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9B27C] line-clamp-1">
                    {page.subtitle || 'M.A. GROUP CORPORATE PROFILE'}
                  </div>
                  <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
                    {page.title}
                  </h3>
                  <p className="text-xs text-[#B8B9BC] line-clamp-3 leading-relaxed">
                    {page.content}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#C9B27C]">
                    <span className="px-2.5 py-1 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/25">
                      {(page.sections || []).length} Custom Sections
                    </span>
                    {page.buttonText && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/25 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> CTA: {page.buttonText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-[#0D0E10]/80 border-t border-[#C9B27C]/20 flex items-center justify-between gap-2">
                <a
                  href={`#/company/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-[#C9B27C] hover:underline"
                >
                  Preview Storefront →
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(page)}
                    className="px-3 py-1.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(page)}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Homepage Company Introduction Control */
        <form
          onSubmit={handleSaveHomepageSection}
          className="p-6 sm:p-8 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/35 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C9B27C]/20">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9B27C]">
                HOMEPAGE SHOWROOM INTRODUCTION
              </span>
              <h3 className="text-xl font-luxury-serif font-semibold text-[#FCFBF8] mt-1">
                &ldquo;Building Trust Through Quality&rdquo; Section Controls
              </h3>
            </div>
            <label className="inline-flex items-center gap-3 cursor-pointer bg-[#0D0E10] px-4 py-2.5 rounded-xl border border-[#C9B27C]/40">
              <input
                type="checkbox"
                checked={hpVisible}
                onChange={(e) => setHpVisible(e.target.checked)}
                className="w-4 h-4 accent-[#C9B27C]"
              />
              <span className="text-xs font-bold uppercase tracking-wider text-[#FCFBF8]">
                {hpVisible ? 'Visible on Homepage (ON)' : 'Hidden from Homepage (OFF)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
                Section Heading
              </label>
              <input
                type="text"
                value={hpHeading}
                onChange={(e) => setHpHeading(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
                placeholder="Building Trust Through Quality"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
                Top Subheading Badge
              </label>
              <input
                type="text"
                value={hpSubheading}
                onChange={(e) => setHpSubheading(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
                placeholder="M.A. GROUP OF COMPANIES — CORPORATE HERITAGE"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
              Introduction Description
            </label>
            <textarea
              rows={4}
              value={hpDescription}
              onChange={(e) => setHpDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={hpButtonText}
                onChange={(e) => setHpButtonText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
                placeholder="Learn About Us"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
                Button Destination Route
              </label>
              <input
                type="text"
                value={hpButtonLink}
                onChange={(e) => setHpButtonLink(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
                placeholder="company/about-ma-group"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={hpOrder}
                onChange={(e) => setHpOrder(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider">
                Featured Corporate Image (Upload or URL)
              </label>
              <input
                type="text"
                value={hpImage}
                onChange={(e) => setHpImage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-xs"
                placeholder="https://..."
              />
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D0E10] hover:bg-[#C9B27C] text-[#C9B27C] hover:text-[#0D0E10] border border-[#C9B27C]/40 text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>Upload Image from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, (b64) => setHpImage(b64))}
                />
              </label>
            </div>
            {hpImage && (
              <img
                src={hpImage}
                alt="Preview"
                className="w-full h-44 object-cover rounded-xl border border-[#C9B27C]/40"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#C9B27C] uppercase tracking-wider mb-2">
              Key Corporate Highlights (One per line)
            </label>
            <textarea
              rows={3}
              value={hpHighlights.join('\n')}
              onChange={(e) => setHpHighlights(e.target.value.split('\n'))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Homepage Company Section'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Add / Edit Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151C2C] border border-[#C9B27C]/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#FCFBF8] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#C9B27C]/25">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9B27C]">
                  M.A. GROUP CORPORATE PAGE BUILDER
                </span>
                <h3 className="text-xl font-luxury-serif font-semibold">
                  {editingPage ? `Edit Page: ${editingPage.title}` : 'Create New Company Profile Page'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg bg-[#0D0E10] text-[#B8B9BC] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editingPage) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-sm text-[#FCFBF8]"
                    placeholder="e.g., Quality Assurance"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-xs font-mono text-[#C9B27C]"
                    placeholder="quality-assurance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-sm text-[#FCFBF8]"
                    placeholder="ISO-Verified Engineering & Strict Inspection Protocols"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                      Order
                    </label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-sm text-[#FCFBF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                      Visibility
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsVisible(!isVisible)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer border ${
                        isVisible
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {isVisible ? 'ON (Visible)' : 'OFF (Hidden)'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                  Main Narrative Content
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-sm text-[#FCFBF8]"
                  placeholder="Write executive overview..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase">
                    Hero Banner Image (URL or Device Upload)
                  </label>
                  <input
                    type="text"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-xs text-[#FCFBF8]"
                    placeholder="https://..."
                  />
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0D0E10] hover:bg-[#C9B27C] text-[#C9B27C] hover:text-[#0D0E10] border border-[#C9B27C]/40 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, (b64) => setHeroImage(b64))}
                    />
                  </label>
                </div>
                {heroImage && (
                  <img
                    src={heroImage}
                    alt="Hero Preview"
                    className="h-28 w-full object-cover rounded-xl border border-[#C9B27C]/30"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                    Primary Call-To-Action Button Text
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-xs text-[#FCFBF8]"
                    placeholder="Explore Our Catalog"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C9B27C] uppercase mb-1.5">
                    Button Destination (e.g. shop, solutions, b2b, contact-us)
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-xs text-[#FCFBF8]"
                    placeholder="shop"
                  />
                </div>
              </div>

              {/* Modular Page Sections */}
              <div className="pt-4 border-t border-[#C9B27C]/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#C9B27C] uppercase tracking-wider flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span>Page Content Sections ({sections.length})</span>
                    </h4>
                    <p className="text-[11px] text-[#B8B9BC]">
                      Add structured content blocks, reorder them, attach images, or add section buttons.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSection}
                    className="px-3.5 py-2 rounded-xl bg-[#0D0E10] hover:bg-[#C9B27C] text-[#C9B27C] hover:text-[#0D0E10] border border-[#C9B27C]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className="p-4 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#C9B27C] font-mono">
                          Section #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveSection(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-[#151C2C] text-[#FCFBF8] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(idx, 'down')}
                            disabled={idx === sections.length - 1}
                            className="p-1 rounded bg-[#151C2C] text-[#FCFBF8] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(idx)}
                            className="p-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={sec.heading}
                          onChange={(e) => updateSection(idx, { heading: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#FCFBF8]"
                          placeholder="Section Heading"
                        />
                        <input
                          type="text"
                          value={sec.subheading || ''}
                          onChange={(e) => updateSection(idx, { subheading: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#C9B27C]"
                          placeholder="Badge / Subheading"
                        />
                      </div>

                      <textarea
                        rows={2}
                        value={sec.content}
                        onChange={(e) => updateSection(idx, { content: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#FCFBF8]"
                        placeholder="Section paragraph..."
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={sec.image || ''}
                            onChange={(e) => updateSection(idx, { image: e.target.value })}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#FCFBF8]"
                            placeholder="Section Image URL"
                          />
                          <label className="px-2.5 py-1.5 rounded-lg bg-[#151C2C] border border-[#C9B27C]/40 text-[#C9B27C] text-[10px] font-bold cursor-pointer shrink-0">
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleImageUpload(e, (b64) => updateSection(idx, { image: b64 }))
                              }
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={sec.buttonText || ''}
                          onChange={(e) => updateSection(idx, { buttonText: e.target.value })}
                          className="px-3 py-1.5 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#FCFBF8]"
                          placeholder="Section Button Text (optional)"
                        />
                        <input
                          type="text"
                          value={sec.buttonLink || ''}
                          onChange={(e) => updateSection(idx, { buttonLink: e.target.value })}
                          className="px-3 py-1.5 rounded-lg bg-[#151C2C] border border-[#C9B27C]/25 text-xs text-[#FCFBF8]"
                          placeholder="Button Destination Route"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#C9B27C]/25 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#0D0E10] text-[#B8B9BC] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? 'Saving...' : editingPage ? 'Update Page' : 'Create Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 text-[#FCFBF8] shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-luxury-serif font-semibold">
              Delete this company profile page?
            </h3>
            <p className="text-xs text-[#B8B9BC]">
              You are about to permanently remove{' '}
              <strong className="text-white">&ldquo;{deleteTarget.title}&rdquo;</strong> from the database and storefront.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0D0E10] text-[#B8B9BC] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
