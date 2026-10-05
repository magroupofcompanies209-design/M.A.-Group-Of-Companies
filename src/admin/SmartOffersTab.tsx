import React, { useState } from 'react';
import type { SmartOffer, SmartOfferType, Coupon, Product, Category } from '../types/index.ts';
import {
  upsertSmartOfferInSupabase,
  deleteSmartOfferFromSupabase,
  upsertCouponInSupabase,
  deleteCouponFromSupabase,
} from '../lib/supabaseClient.ts';
import { safeJsonResponse } from '../utils/api.ts';
import {
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Flame,
  Calendar,
  AlertTriangle,
  X,
} from 'lucide-react';

interface SmartOffersTabProps {
  smartOffers: SmartOffer[];
  coupons: Coupon[];
  products: Product[];
  categories: Category[];
  onRefreshOffers: () => Promise<void>;
  onRefreshCoupons: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const OFFER_TYPES: SmartOfferType[] = [
  'Flash Sale',
  'Percentage Discount',
  'Fixed PKR Discount',
  'Category Discount',
  'Product Discount',
  'Buy More Save More',
  'Bundle Offer',
  'Free Delivery',
  'Limited-Time Offer',
  'New Customer Offer',
  'Seasonal Offer',
];

export const SmartOffersTab: React.FC<SmartOffersTabProps> = ({
  smartOffers,
  coupons,
  categories,
  onRefreshOffers,
  onRefreshCoupons,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'offers' | 'coupons'>('offers');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SmartOffer | null>(null);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<SmartOffer | null>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Offer Form State
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [offerType, setOfferType] = useState<SmartOfferType>('Flash Sale');
  const [discountPercentage, setDiscountPercentage] = useState<number>(10);
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<number>(0);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applicableCategories, setApplicableCategories] = useState<string[]>([]);
  const [badgeText, setBadgeText] = useState('LIMITED OFFER');
  const [countdownTimerEnabled, setCountdownTimerEnabled] = useState(true);
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [priorityOrder, setPriorityOrder] = useState<number>(1);
  const [ctaText, setCtaText] = useState('Claim Offer');
  const [ctaLink, setCtaLink] = useState('deals');

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponVal, setCouponVal] = useState<number>(10);
  const [couponMinOrder, setCouponMinOrder] = useState<number>(0);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number>(0);
  const [couponStart, setCouponStart] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponUsageLimit, setCouponUsageLimit] = useState<number>(100);
  const [couponActive, setCouponActive] = useState(true);

  const openAddOffer = () => {
    setEditingOffer(null);
    setName('');
    setShortDescription('');
    setBannerImage(
      'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=85'
    );
    setOfferType('Flash Sale');
    setDiscountPercentage(10);
    setFixedDiscountAmount(0);
    setMinOrderValue(0);
    setMaxDiscount(25000);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setApplicableCategories([]);
    setBadgeText('FLASH SALE');
    setCountdownTimerEnabled(true);
    setShowOnHomepage(true);
    setIsActive(true);
    setPriorityOrder(smartOffers.length + 1);
    setCtaText('Shop Offer');
    setCtaLink('deals');
    setIsOfferModalOpen(true);
  };

  const openEditOffer = (o: SmartOffer) => {
    setEditingOffer(o);
    setName(o.name);
    setShortDescription(o.shortDescription || '');
    setBannerImage(o.bannerImage || '');
    setOfferType(o.offerType || 'Flash Sale');
    setDiscountPercentage(o.discountPercentage || 0);
    setFixedDiscountAmount(o.fixedDiscountAmount || 0);
    setMinOrderValue(o.minOrderValue || 0);
    setMaxDiscount(o.maxDiscount || 0);
    setStartDate(o.startDate ? o.startDate.slice(0, 10) : '');
    setEndDate(o.endDate ? o.endDate.slice(0, 10) : '');
    setApplicableCategories(o.applicableCategories || []);
    setBadgeText(o.badgeText || 'SPECIAL OFFER');
    setCountdownTimerEnabled(o.countdownTimerEnabled !== false);
    setShowOnHomepage(o.showOnHomepage !== false);
    setIsActive(o.isActive !== false);
    setPriorityOrder(o.priorityOrder ?? 1);
    setCtaText(o.ctaText || 'Shop Offer');
    setCtaLink(o.ctaLink || 'deals');
    setIsOfferModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImage(reader.result);
        showToast('Banner image loaded.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Offer name is required.', 'error');
      return;
    }
    setSaving(true);
    const payload: SmartOffer = {
      id: editingOffer?.id || `offer-${Date.now()}`,
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      bannerImage: bannerImage.trim(),
      offerType,
      discountPercentage: Number(discountPercentage) || 0,
      fixedDiscountAmount: Number(fixedDiscountAmount) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      applicableCategories,
      badgeText: badgeText.trim() || 'SPECIAL OFFER',
      countdownTimerEnabled,
      showOnHomepage,
      isActive,
      priorityOrder: Number(priorityOrder) || 1,
      ctaText: ctaText.trim() || 'Shop Offer',
      ctaLink: ctaLink.trim() || 'deals',
      createdAt: editingOffer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const url = editingOffer ? `/api/smart-offers/${editingOffer.id}` : '/api/smart-offers';
      const method = editingOffer ? 'PUT' : 'POST';
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
      await upsertSmartOfferInSupabase(saved.id ? saved : payload);
      await onRefreshOffers();
      showToast(editingOffer ? 'Smart Offer updated!' : 'Smart Offer created!', 'success');
      setIsOfferModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save offer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOffer = async (offer: SmartOffer) => {
    const updated: SmartOffer = {
      ...offer,
      isActive: !offer.isActive,
      updatedAt: new Date().toISOString(),
    };
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/smart-offers/${offer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      await upsertSmartOfferInSupabase(updated);
      await onRefreshOffers();
      showToast(
        `"${offer.name}" is now ${updated.isActive ? 'ACTIVE on Storefront' : 'HIDDEN from Storefront'}.`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle offer status.', 'error');
    }
  };

  const handleConfirmDeleteOffer = async () => {
    if (!deleteOfferTarget) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/smart-offers/${deleteOfferTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
      await deleteSmartOfferFromSupabase(deleteOfferTarget.id);
      await onRefreshOffers();
      showToast(`Deleted offer "${deleteOfferTarget.name}".`, 'info');
      setDeleteOfferTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete offer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponDesc('');
    setCouponType('percentage');
    setCouponVal(10);
    setCouponMinOrder(10000);
    setCouponMaxDiscount(15000);
    setCouponStart(new Date().toISOString().slice(0, 10));
    setCouponExpiry(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setCouponUsageLimit(100);
    setCouponActive(true);
    setIsCouponModalOpen(true);
  };

  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponCode(c.code);
    setCouponDesc(c.description);
    setCouponType(c.discountType);
    setCouponVal(c.discountValue);
    setCouponMinOrder(c.minOrderAmount || 0);
    setCouponMaxDiscount(c.maxDiscount || 0);
    setCouponStart(c.startDate ? c.startDate.slice(0, 10) : '');
    setCouponExpiry(c.expiresAt ? c.expiresAt.slice(0, 10) : '');
    setCouponUsageLimit(c.usageLimit || 100);
    setCouponActive(c.isActive !== false);
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      showToast('Coupon code is required.', 'error');
      return;
    }
    setSaving(true);
    const payload: Coupon = {
      id: editingCoupon?.id || `coup-${Date.now()}`,
      code: couponCode.trim().toUpperCase(),
      description: couponDesc.trim(),
      discountType: couponType,
      discountValue: Number(couponVal) || 0,
      minOrderAmount: Number(couponMinOrder) || 0,
      maxDiscount: Number(couponMaxDiscount) || 0,
      startDate: couponStart ? new Date(couponStart).toISOString() : undefined,
      expiresAt: couponExpiry ? new Date(couponExpiry).toISOString() : undefined,
      usageLimit: Number(couponUsageLimit) || 100,
      timesUsed: editingCoupon?.timesUsed || 0,
      isActive: couponActive,
    };

    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
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
      await upsertCouponInSupabase(saved.id ? saved : payload);
      await onRefreshCoupons();
      showToast(`Coupon ${payload.code} saved!`, 'success');
      setIsCouponModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save coupon.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteCoupon = async () => {
    if (!deleteCouponTarget) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      await fetch(`/api/coupons/${deleteCouponTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
      await deleteCouponFromSupabase(deleteCouponTarget.id);
      await onRefreshCoupons();
      showToast(`Deleted coupon ${deleteCouponTarget.code}`, 'info');
      setDeleteCouponTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete coupon.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0D0E10] border border-[#C9B27C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#C9B27C] text-xs font-bold uppercase tracking-[0.2em]">
            <Sparkles className="w-4 h-4" />
            <span>PROMOTIONAL CAMPAIGNS &amp; COUPON ENGINE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-luxury-serif font-semibold text-[#FCFBF8]">
            Smart Offers, Flash Sales &amp; Promo Codes
          </h2>
          <p className="text-xs text-[#B8B9BC] max-w-2xl">
            Launch Flash Sales, Percentage/PKR Discounts, Bundle Offers, Free Delivery campaigns, and checkout Promo Codes synced with Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-[#151C2C] p-1 border border-[#C9B27C]/30">
            <button
              type="button"
              onClick={() => setSubTab('offers')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'offers'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Smart Campaigns ({smartOffers.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('coupons')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subTab === 'coupons'
                  ? 'bg-[#C9B27C] text-[#0D0E10]'
                  : 'text-[#FCFBF8] hover:text-[#C9B27C]'
              }`}
            >
              Coupon Codes ({coupons.length})
            </button>
          </div>

          {subTab === 'offers' ? (
            <button
              type="button"
              onClick={openAddOffer}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Smart Offer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddCoupon}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon Code</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'offers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...smartOffers]
            .sort((a, b) => (a.priorityOrder ?? 99) - (b.priorityOrder ?? 99))
            .map((offer) => (
              <div
                key={offer.id}
                className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                  offer.isActive
                    ? 'bg-[#151C2C]/95 border-[#C9B27C]/35'
                    : 'bg-neutral-900/60 border-neutral-800 opacity-75'
                }`}
              >
                <div>
                  <div className="relative h-44 bg-[#0D0E10] overflow-hidden border-b border-[#C9B27C]/20">
                    {offer.bannerImage ? (
                      <img
                        src={offer.bannerImage}
                        alt={offer.name}
                        className="w-full h-full object-cover opacity-85"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C9B27C]/30">
                        <Flame className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-[#C9B27C] text-[#0D0E10] text-[10px] font-black uppercase tracking-wider">
                        {offer.badgeText || offer.offerType}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#0D0E10]/90 text-[#FCFBF8] text-[10px] font-mono">
                        Priority #{offer.priorityOrder ?? 1}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <button
                        type="button"
                        onClick={() => handleToggleOffer(offer)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                          offer.isActive
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {offer.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Off
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#C9B27C] font-semibold">
                      <span>{offer.offerType}</span>
                      <span>
                        {offer.discountPercentage
                          ? `${offer.discountPercentage}% OFF`
                          : offer.fixedDiscountAmount
                          ? `PKR ${offer.fixedDiscountAmount.toLocaleString()} OFF`
                          : 'Special Benefit'}
                      </span>
                    </div>
                    <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
                      {offer.name}
                    </h3>
                    <p className="text-xs text-[#B8B9BC] line-clamp-2 leading-relaxed">
                      {offer.shortDescription}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-[#B8B9BC]">
                      {offer.minOrderValue ? (
                        <span className="px-2 py-0.5 rounded bg-[#0D0E10] border border-[#C9B27C]/20">
                          Min Order: PKR {offer.minOrderValue.toLocaleString()}
                        </span>
                      ) : null}
                      {offer.endDate ? (
                        <span className="px-2 py-0.5 rounded bg-[#0D0E10] border border-[#C9B27C]/20 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#C9B27C]" /> Ends{' '}
                          {new Date(offer.endDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#0D0E10]/80 border-t border-[#C9B27C]/20 flex items-center justify-between">
                  <span className="text-[11px] text-[#B8B9BC]">
                    {offer.countdownTimerEnabled ? '⏱ Countdown ON' : 'No Timer'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditOffer(offer)}
                      className="px-3 py-1.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteOfferTarget(offer)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#151C2C] border border-[#C9B27C]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0D0E10] text-[#C9B27C] uppercase tracking-wider text-[11px] border-b border-[#C9B27C]/20">
                  <th className="p-4">Promo Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min Order / Max Cap</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9B27C]/15 text-[#FCFBF8]">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#0D0E10]/40">
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-lg bg-[#0D0E10] border border-[#C9B27C]/40 font-mono font-bold text-[#C9B27C]">
                        {c.code}
                      </span>
                      <div className="text-[11px] text-[#B8B9BC] mt-1">{c.description}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-[#C9B27C]">
                      {c.discountType === 'percentage'
                        ? `${c.discountValue}% OFF`
                        : `PKR ${c.discountValue.toLocaleString()} OFF`}
                    </td>
                    <td className="p-4 text-[#B8B9BC]">
                      <div>Min: PKR {(c.minOrderAmount || 0).toLocaleString()}</div>
                      {c.maxDiscount ? <div>Max: PKR {c.maxDiscount.toLocaleString()}</div> : null}
                    </td>
                    <td className="p-4 font-mono">
                      {c.timesUsed || 0} / {c.usageLimit || '∞'}
                    </td>
                    <td className="p-4 text-[#B8B9BC]">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No Expiry'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          c.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCoupon(c)}
                          className="px-3 py-1.5 rounded-lg bg-[#0D0E10] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/30 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCouponTarget(c)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151C2C] border border-[#C9B27C]/40 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-[#FCFBF8] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C9B27C]/25">
              <h3 className="text-lg font-luxury-serif font-semibold">
                {editingOffer ? `Edit Smart Offer: ${editingOffer.name}` : 'Create Smart Offer'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Offer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Offer Type
                  </label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value as SmartOfferType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  >
                    {OFFER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Fixed PKR Off
                  </label>
                  <input
                    type="number"
                    value={fixedDiscountAmount}
                    onChange={(e) => setFixedDiscountAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Min Order PKR
                  </label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Max Cap PKR
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-2">
                  <label className="block font-semibold text-[#C9B27C] uppercase">
                    Banner Image
                  </label>
                  <input
                    type="text"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 text-[#C9B27C] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                {bannerImage && (
                  <img
                    src={bannerImage}
                    alt="Preview"
                    className="h-24 w-full object-cover rounded-xl border border-[#C9B27C]/30"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#C9B27C] uppercase mb-1.5">
                  Applicable Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = applicableCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setApplicableCategories((prev) =>
                            selected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          )
                        }
                        className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                          selected
                            ? 'bg-[#C9B27C] text-[#0D0E10] border-[#C9B27C]'
                            : 'bg-[#0D0E10] text-[#B8B9BC] border-[#C9B27C]/25'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span>Active (ON)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnHomepage}
                    onChange={(e) => setShowOnHomepage(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span>Homepage</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={countdownTimerEnabled}
                    onChange={(e) => setCountdownTimerEnabled(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span>Timer ON</span>
                </label>
                <input
                  type="number"
                  value={priorityOrder}
                  onChange={(e) => setPriorityOrder(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/25 text-[#FCFBF8]"
                  placeholder="Priority"
                />
              </div>

              <div className="pt-3 border-t border-[#C9B27C]/25 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold uppercase cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-[#C9B27C]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 text-[#FCFBF8] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#C9B27C]/25">
              <h3 className="text-lg font-luxury-serif font-semibold">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promo Coupon'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 font-mono font-bold text-[#C9B27C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed PKR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={couponDesc}
                  onChange={(e) => setCouponDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={couponVal}
                    onChange={(e) => setCouponVal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Min Order PKR
                  </label>
                  <input
                    type="number"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Max Cap PKR
                  </label>
                  <input
                    type="number"
                    value={couponMaxDiscount}
                    onChange={(e) => setCouponMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C9B27C] uppercase mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={couponUsageLimit}
                    onChange={(e) => setCouponUsageLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 text-[#FCFBF8]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={couponActive}
                  onChange={(e) => setCouponActive(e.target.checked)}
                  className="accent-[#C9B27C]"
                />
                <span className="font-bold">Coupon Active (ON)</span>
              </label>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D0E10] text-[#B8B9BC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold uppercase cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOfferTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 text-[#FCFBF8]">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-luxury-serif font-semibold">Delete this Smart Offer?</h3>
            <p className="text-xs text-[#B8B9BC]">
              Remove <strong>&ldquo;{deleteOfferTarget.name}&rdquo;</strong>?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteOfferTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0D0E10] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOffer}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCouponTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 text-[#FCFBF8]">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-luxury-serif font-semibold">Delete Coupon Code?</h3>
            <p className="text-xs text-[#B8B9BC]">
              Permanently delete promo code <strong>{deleteCouponTarget.code}</strong>?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteCouponTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0D0E10] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCoupon}
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
