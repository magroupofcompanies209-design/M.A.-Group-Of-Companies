import React, { useState, useEffect } from 'react';
import type {
  DeliveryZone,
  DeliveryArea,
  DeliverySettings,
  DeliveryChargeMethod,
  FreeDeliveryRule,
  DeliveryHoliday,
  Product,
} from '../types/index.ts';
import {
  upsertDeliveryZoneInSupabase,
  deleteDeliveryZoneFromSupabase,
  upsertDeliveryAreaInSupabase,
  deleteDeliveryAreaFromSupabase,
  saveDeliverySettingsInSupabase,
  insertOrUpdateProductInSupabase,
} from '../lib/supabaseClient.ts';
import {
  Truck,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Settings,
  BarChart3,
  ShieldCheck,
  Clock,
  Scale,
  Package,
  AlertTriangle,
  Layers,
  RefreshCw,
} from 'lucide-react';

interface DeliveryManagementTabProps {
  products: Product[];
  onRefreshProducts: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Islamabad Capital Territory',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

export const DeliveryManagementTab: React.FC<DeliveryManagementTabProps> = ({
  products,
  onRefreshProducts,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<
    | 'overview'
    | 'zones'
    | 'areas'
    | 'rules'
    | 'product-rules'
    | 'schedule'
    | 'reports'
  >('overview');

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters & Quick Lookup
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneStatusFilter, setZoneStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');
  const [areaStatusFilter, setAreaStatusFilter] = useState<'all' | 'active' | 'inactive' | 'remote'>('all');

  // Quick Support Lookup Tool
  const [lookupQuery, setLookupQuery] = useState('');

  // Zone Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zName, setZName] = useState('');
  const [zCode, setZCode] = useState('');
  const [zDescription, setZDescription] = useState('');
  const [zProvince, setZProvince] = useState('Punjab');
  const [zBaseCharge, setZBaseCharge] = useState(300);
  const [zChargeType, setZChargeType] = useState<DeliveryChargeMethod>('fixed');
  const [zPctRate, setZPctRate] = useState(2);
  const [zFreeThreshold, setZFreeThreshold] = useState<string>('8000');
  const [zMinDays, setZMinDays] = useState(2);
  const [zMaxDays, setZMaxDays] = useState(4);
  const [zCodEnabled, setZCodEnabled] = useState(true);
  const [zCodMin, setZCodMin] = useState(500);
  const [zCodMax, setZCodMax] = useState(400000);
  const [zInstallCharge, setZInstallCharge] = useState(2000);
  const [zOrder, setZOrder] = useState(1);
  const [zActive, setZActive] = useState(true);
  const [zNotes, setZNotes] = useState('');

  // Area Modal State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [aZoneId, setAZoneId] = useState('zone-lahore');
  const [aName, setAName] = useState('');
  const [aCode, setACode] = useState('');
  const [aCity, setACity] = useState('Lahore');
  const [aProvince, setAProvince] = useState('Punjab');
  const [aPostalCode, setAPostalCode] = useState('');
  const [aCharge, setACharge] = useState<string>('');
  const [aChargeType, setAChargeType] = useState<DeliveryChargeMethod>('fixed');
  const [aFreeThreshold, setAFreeThreshold] = useState<string>('');
  const [aMinDays, setAMinDays] = useState<string>('');
  const [aMaxDays, setAMaxDays] = useState<string>('');
  const [aCodEnabled, setACodEnabled] = useState(true);
  const [aCodMin, setACodMin] = useState<string>('');
  const [aCodMax, setACodMax] = useState<string>('');
  const [aRemote, setARemote] = useState(false);
  const [aRemoteSurcharge, setARemoteSurcharge] = useState(0);
  const [aInstallCharge, setAInstallCharge] = useState<string>('');
  const [aActive, setAActive] = useState(true);
  const [aNotes, setANotes] = useState('');

  // Bulk Area Add Modal State
  const [isBulkAreaOpen, setIsBulkAreaOpen] = useState(false);
  const [bulkZoneId, setBulkZoneId] = useState('zone-lahore');
  const [bulkCity, setBulkCity] = useState('Lahore');
  const [bulkProvince, setBulkProvince] = useState('Punjab');
  const [bulkCharge, setBulkCharge] = useState<string>('250');
  const [bulkCod, setBulkCod] = useState(true);
  const [bulkLinesText, setBulkLinesText] = useState('');

  // Delete Confirmations
  const [deleteZoneConfirm, setDeleteZoneConfirm] = useState<DeliveryZone | null>(null);
  const [deleteAreaConfirm, setDeleteAreaConfirm] = useState<DeliveryArea | null>(null);

  // Free Delivery Rule Form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleMinOrder, setNewRuleMinOrder] = useState(10000);
  const [newRuleZoneId, setNewRuleZoneId] = useState('all');

  // Holiday Form
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const getToken = () =>
    localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';

  const loadDeliveryData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      };
      const [zRes, aRes, sRes, rRes] = await Promise.all([
        fetch('/api/delivery/zones', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/delivery/areas', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/delivery/settings', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/delivery/reports', { headers, cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (Array.isArray(zRes)) setZones(zRes);
      if (Array.isArray(aRes)) setAreas(aRes);
      if (sRes && typeof sRes === 'object') setDeliverySettings(sRes);
      if (rRes) setReports(rRes);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load delivery configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryData();
  }, []);

  // --- Zone Actions ---
  const openCreateZone = () => {
    setEditingZone(null);
    setZName('');
    setZCode(`ZN-${zones.length + 1}`);
    setZDescription('');
    setZProvince('Punjab');
    setZBaseCharge(350);
    setZChargeType('fixed');
    setZPctRate(2);
    setZFreeThreshold('10000');
    setZMinDays(2);
    setZMaxDays(5);
    setZCodEnabled(true);
    setZCodMin(500);
    setZCodMax(400000);
    setZInstallCharge(2000);
    setZOrder(zones.length + 1);
    setZActive(true);
    setZNotes('');
    setIsZoneModalOpen(true);
  };

  const openEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZName(zone.name);
    setZCode(zone.code);
    setZDescription(zone.description || '');
    setZProvince(zone.province || 'Punjab');
    setZBaseCharge(zone.baseCharge);
    setZChargeType(zone.chargeType || 'fixed');
    setZPctRate(zone.percentageRate ?? 2);
    setZFreeThreshold(
      zone.freeDeliveryThreshold !== undefined ? String(zone.freeDeliveryThreshold) : ''
    );
    setZMinDays(zone.minDeliveryDays);
    setZMaxDays(zone.maxDeliveryDays);
    setZCodEnabled(zone.codEnabled !== false);
    setZCodMin(zone.codMinAmount ?? 500);
    setZCodMax(zone.codMaxAmount ?? 400000);
    setZInstallCharge(zone.installationBaseCharge ?? 2000);
    setZOrder(zone.displayOrder || 1);
    setZActive(zone.isActive !== false);
    setZNotes(zone.notes || '');
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zName.trim()) {
      showToast('Zone name is required', 'error');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const payload: DeliveryZone = {
      id: editingZone?.id || `zone-${Date.now()}`,
      name: zName.trim(),
      code: zCode.trim().toUpperCase() || 'ZN',
      description: zDescription.trim(),
      province: zProvince,
      baseCharge: Number(zBaseCharge) || 0,
      chargeType: zChargeType,
      percentageRate: Number(zPctRate) || 2,
      freeDeliveryThreshold: zFreeThreshold !== '' ? Number(zFreeThreshold) : undefined,
      minDeliveryDays: Number(zMinDays) || 1,
      maxDeliveryDays: Number(zMaxDays) || 3,
      codEnabled: zCodEnabled,
      codMinAmount: Number(zCodMin) || 0,
      codMaxAmount: Number(zCodMax) || 500000,
      installationBaseCharge: Number(zInstallCharge) || 0,
      isActive: zActive,
      displayOrder: Number(zOrder) || 1,
      notes: zNotes.trim(),
      createdAt: editingZone?.createdAt || now,
      updatedAt: now,
    };

    try {
      const token = getToken();
      const res = await fetch(
        editingZone ? `/api/delivery/zones/${editingZone.id}` : '/api/delivery/zones',
        {
          method: editingZone ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error('Failed to save zone');
      const saved = await res.json();
      await upsertDeliveryZoneInSupabase(saved, zones);
      showToast(`Delivery Zone "${saved.name}" saved & synced with Supabase!`, 'success');
      setIsZoneModalOpen(false);
      await loadDeliveryData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save zone', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateZone = async (zone: DeliveryZone) => {
    const now = new Date().toISOString();
    const copy: DeliveryZone = {
      ...zone,
      id: `zone-${Date.now()}`,
      name: `${zone.name} (Copy)`,
      code: `${zone.code}-COPY`,
      displayOrder: zones.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    const token = getToken();
    await fetch('/api/delivery/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(copy),
    });
    await upsertDeliveryZoneInSupabase(copy, zones);
    showToast(`Duplicated "${zone.name}"`, 'success');
    await loadDeliveryData();
  };

  const handleToggleZoneActive = async (zone: DeliveryZone) => {
    const updated = { ...zone, isActive: !zone.isActive, updatedAt: new Date().toISOString() };
    const token = getToken();
    await fetch(`/api/delivery/zones/${zone.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updated),
    });
    await upsertDeliveryZoneInSupabase(updated, zones);
    showToast(
      `Zone "${zone.name}" is now ${updated.isActive ? 'Active' : 'Disabled'}.`,
      'info'
    );
    await loadDeliveryData();
  };

  const handleConfirmDeleteZone = async () => {
    if (!deleteZoneConfirm) return;
    const token = getToken();
    await fetch(`/api/delivery/zones/${deleteZoneConfirm.id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
    });
    await deleteDeliveryZoneFromSupabase(deleteZoneConfirm.id, zones);
    showToast(`Deleted Zone "${deleteZoneConfirm.name}"`, 'info');
    setDeleteZoneConfirm(null);
    await loadDeliveryData();
  };

  // --- Area Actions ---
  const openCreateArea = (defaultZoneId?: string) => {
    setEditingArea(null);
    const targetZone =
      zones.find((z) => z.id === (defaultZoneId || selectedZoneFilter)) || zones[0];
    setAZoneId(targetZone?.id || 'zone-lahore');
    setAName('');
    setACode(`AR-${areas.length + 1}`);
    setACity(targetZone?.name.includes('Lahore') ? 'Lahore' : 'Islamabad');
    setAProvince(targetZone?.province || 'Punjab');
    setAPostalCode('');
    setACharge('');
    setAChargeType('fixed');
    setAFreeThreshold('');
    setAMinDays('');
    setAMaxDays('');
    setACodEnabled(true);
    setACodMin('');
    setACodMax('');
    setARemote(false);
    setARemoteSurcharge(0);
    setAInstallCharge('');
    setAActive(true);
    setANotes('');
    setIsAreaModalOpen(true);
  };

  const openEditArea = (area: DeliveryArea) => {
    setEditingArea(area);
    setAZoneId(area.zoneId);
    setAName(area.name);
    setACode(area.code);
    setACity(area.city);
    setAProvince(area.province);
    setAPostalCode(area.postalCode || '');
    setACharge(
      area.deliveryCharge !== undefined && area.deliveryCharge !== null
        ? String(area.deliveryCharge)
        : ''
    );
    setAChargeType(area.chargeType || 'fixed');
    setAFreeThreshold(
      area.freeDeliveryThreshold !== undefined && area.freeDeliveryThreshold !== null
        ? String(area.freeDeliveryThreshold)
        : ''
    );
    setAMinDays(area.minDeliveryDays ? String(area.minDeliveryDays) : '');
    setAMaxDays(area.maxDeliveryDays ? String(area.maxDeliveryDays) : '');
    setACodEnabled(area.codEnabled !== false);
    setACodMin(area.codMinAmount ? String(area.codMinAmount) : '');
    setACodMax(area.codMaxAmount ? String(area.codMaxAmount) : '');
    setARemote(Boolean(area.isRemoteArea));
    setARemoteSurcharge(area.remoteSurcharge || 0);
    setAInstallCharge(area.installationCharge ? String(area.installationCharge) : '');
    setAActive(area.isActive !== false);
    setANotes(area.notes || '');
    setIsAreaModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName.trim() || !aCity.trim()) {
      showToast('Area name and city are required', 'error');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const parentZone = zones.find((z) => z.id === aZoneId);
    const payload: DeliveryArea = {
      id: editingArea?.id || `area-${Date.now()}`,
      zoneId: aZoneId,
      zoneName: parentZone?.name || 'Assigned Zone',
      name: aName.trim(),
      code: aCode.trim().toUpperCase() || 'AREA',
      city: aCity.trim(),
      province: aProvince,
      postalCode: aPostalCode.trim(),
      deliveryCharge: aCharge !== '' ? Number(aCharge) : null,
      chargeType: aChargeType,
      freeDeliveryThreshold: aFreeThreshold !== '' ? Number(aFreeThreshold) : null,
      minDeliveryDays: aMinDays !== '' ? Number(aMinDays) : null,
      maxDeliveryDays: aMaxDays !== '' ? Number(aMaxDays) : null,
      codEnabled: aCodEnabled,
      codMinAmount: aCodMin !== '' ? Number(aCodMin) : null,
      codMaxAmount: aCodMax !== '' ? Number(aCodMax) : null,
      isRemoteArea: aRemote,
      remoteSurcharge: Number(aRemoteSurcharge) || 0,
      installationCharge: aInstallCharge !== '' ? Number(aInstallCharge) : null,
      isActive: aActive,
      notes: aNotes.trim(),
      createdAt: editingArea?.createdAt || now,
      updatedAt: now,
    };

    try {
      const token = getToken();
      const res = await fetch(
        editingArea ? `/api/delivery/areas/${editingArea.id}` : '/api/delivery/areas',
        {
          method: editingArea ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error('Failed to save delivery area');
      const saved = await res.json();
      await upsertDeliveryAreaInSupabase(saved, areas);
      showToast(`Area "${saved.name}" saved & synced with Supabase!`, 'success');
      setIsAreaModalOpen(false);
      await loadDeliveryData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save area', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCreateAreas = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkLinesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      showToast('Please enter at least one area name per line.', 'error');
      return;
    }
    setSaving(true);
    try {
      const batch = names.map((n, idx) => ({
        zoneId: bulkZoneId,
        name: n,
        code: `${bulkCity.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}-${idx + 1}`,
        city: bulkCity.trim(),
        province: bulkProvince,
        deliveryCharge: bulkCharge !== '' ? Number(bulkCharge) : null,
        codEnabled: bulkCod,
        isRemoteArea: false,
        remoteSurcharge: 0,
        isActive: true,
      }));
      const token = getToken();
      const res = await fetch('/api/delivery/areas/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ areas: batch }),
      });
      const data = await res.json();
      if (Array.isArray(data?.areas)) {
        for (const a of batch) {
          const found = data.areas.find((x: DeliveryArea) => x.name === a.name && x.city === a.city);
          if (found) await upsertDeliveryAreaInSupabase(found, data.areas);
        }
      }
      showToast(`Bulk added ${names.length} delivery areas!`, 'success');
      setBulkLinesText('');
      setIsBulkAreaOpen(false);
      await loadDeliveryData();
    } catch (err: any) {
      showToast(err?.message || 'Bulk creation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteArea = async () => {
    if (!deleteAreaConfirm) return;
    const token = getToken();
    await fetch(`/api/delivery/areas/${deleteAreaConfirm.id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
    });
    await deleteDeliveryAreaFromSupabase(deleteAreaConfirm.id, areas);
    showToast(`Deleted Area "${deleteAreaConfirm.name}"`, 'info');
    setDeleteAreaConfirm(null);
    await loadDeliveryData();
  };

  const handleSaveGlobalSettings = async (updated: DeliverySettings) => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch('/api/delivery/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to save delivery settings');
      const saved = await res.json();
      setDeliverySettings(saved);
      await saveDeliverySettingsInSupabase(saved);
      showToast('Delivery settings saved & synced to Supabase!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProductDeliveryRule = async (
    product: Product,
    updates: Partial<Product>
  ) => {
    const merged: Product = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const token = getToken();
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(merged),
    });
    await insertOrUpdateProductInSupabase(merged, products);
    showToast(`Updated delivery & installation rules for "${product.name}"`, 'success');
    await onRefreshProducts();
  };

  const filteredZones = zones.filter((z) => {
    if (zoneStatusFilter === 'active' && !z.isActive) return false;
    if (zoneStatusFilter === 'inactive' && z.isActive) return false;
    if (
      zoneSearch.trim() &&
      !z.name.toLowerCase().includes(zoneSearch.toLowerCase()) &&
      !z.code.toLowerCase().includes(zoneSearch.toLowerCase()) &&
      !z.province.toLowerCase().includes(zoneSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredAreas = areas.filter((a) => {
    if (selectedZoneFilter !== 'all' && a.zoneId !== selectedZoneFilter) return false;
    if (areaStatusFilter === 'active' && !a.isActive) return false;
    if (areaStatusFilter === 'inactive' && a.isActive) return false;
    if (areaStatusFilter === 'remote' && !a.isRemoteArea) return false;
    if (
      areaSearch.trim() &&
      !a.name.toLowerCase().includes(areaSearch.toLowerCase()) &&
      !a.city.toLowerCase().includes(areaSearch.toLowerCase()) &&
      !a.code.toLowerCase().includes(areaSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const lookupResults = lookupQuery.trim()
    ? areas.filter(
        (a) =>
          a.name.toLowerCase().includes(lookupQuery.toLowerCase()) ||
          a.city.toLowerCase().includes(lookupQuery.toLowerCase()) ||
          (a.postalCode || '').includes(lookupQuery.trim()) ||
          (a.zoneName || '').toLowerCase().includes(lookupQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 text-[#C9B27C] text-xs font-semibold uppercase tracking-widest mb-1">
            <Truck className="w-4 h-4" />
            <span>Nationwide Logistics &amp; Pricing Engine</span>
          </div>
          <h2 className="font-luxury-serif text-2xl sm:text-3xl font-bold text-[#FCFBF8]">
            Delivery, Areas &amp; Zones Management
          </h2>
          <p className="text-xs text-[#B8B9BC] mt-1">
            Control 5-tier priority delivery charges, zones, areas, weight brackets, COD limits,
            cut-off times, and installation rules synced with Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateZone}
            className="px-4 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Zone</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateArea()}
            className="px-4 py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Area</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkAreaOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#C9B27C]" />
            <span>Bulk Add Areas</span>
          </button>
          <button
            type="button"
            onClick={loadDeliveryData}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer"
            title="Refresh Delivery Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C9B27C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#151C2C]/60 p-1.5 rounded-xl border border-[#C9B27C]/25">
        {[
          { id: 'overview', label: 'Overview & Area Lookup', icon: Search },
          { id: 'zones', label: `Delivery Zones (${zones.length})`, icon: MapPin },
          { id: 'areas', label: `Delivery Areas (${areas.length})`, icon: Truck },
          { id: 'rules', label: 'Charges, Weight & COD Rules', icon: Scale },
          { id: 'product-rules', label: 'Product Delivery & Installation', icon: Package },
          { id: 'schedule', label: 'Cut-Off, Working Days & Holidays', icon: Clock },
          { id: 'reports', label: 'Delivery Analytics', icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-[#C9B27C] text-[#0D0E10] shadow-sm'
                  : 'text-[#B8B9BC] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: OVERVIEW & CUSTOMER SUPPORT AREA LOOKUP */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25 space-y-1">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Active Delivery Zones</div>
              <div className="text-2xl font-bold text-[#FCFBF8] font-mono">
                {zones.filter((z) => z.isActive).length} / {zones.length}
              </div>
              <div className="text-[11px] text-[#C9B27C]">Across all provinces of Pakistan</div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25 space-y-1">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Configured Delivery Areas</div>
              <div className="text-2xl font-bold text-[#FCFBF8] font-mono">
                {areas.filter((a) => a.isActive).length} / {areas.length}
              </div>
              <div className="text-[11px] text-emerald-400">
                {areas.filter((a) => a.isRemoteArea).length} Remote Surcharge Areas
              </div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25 space-y-1">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Global Free Delivery</div>
              <div className="text-2xl font-bold text-[#C9B27C] font-mono">
                Rs. {(deliverySettings?.globalFreeDeliveryThreshold || 10000).toLocaleString()}+
              </div>
              <div className="text-[11px] text-[#B8B9BC]">
                Default Charge: Rs. {deliverySettings?.defaultCharge || 450}
              </div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25 space-y-1">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Daily Dispatch Cut-Off</div>
              <div className="text-2xl font-bold text-[#FCFBF8] font-mono">
                {deliverySettings?.cutoffTime || '16:00'} PKT
              </div>
              <div className="text-[11px] text-[#B8B9BC]">
                Same-day processing before cut-off
              </div>
            </div>
          </div>

          {/* Instant Customer Support Area Lookup */}
          <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/35 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
                  Customer Support Instant Area &amp; Rate Lookup
                </h3>
                <p className="text-xs text-[#B8B9BC]">
                  Search any Area, Sector, City, or Zone to immediately check Delivery Charge, COD
                  eligibility, Free Delivery threshold, and Estimated Delivery Days.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#C9B27C] absolute left-4 top-3.5" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Type area or city name (e.g. DHA, Gulberg, Bahria, Raiwind, Karachi, Islamabad)..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/40 text-sm text-[#FCFBF8] focus:outline-none focus:border-[#C9B27C]"
              />
            </div>

            {lookupQuery.trim() && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {lookupResults.length === 0 ? (
                  <div className="col-span-full p-4 rounded-xl bg-[#0D0E10] border border-neutral-800 text-xs text-[#B8B9BC]">
                    No exact area match found for &ldquo;{lookupQuery}&rdquo;. Checkout will
                    automatically fall back to Zone / City Default charge (Rs.{' '}
                    {deliverySettings?.defaultCharge || 450}).
                  </div>
                ) : (
                  lookupResults.map((a) => {
                    const z = zones.find((zn) => zn.id === a.zoneId);
                    const base =
                      a.deliveryCharge !== null && a.deliveryCharge !== undefined
                        ? a.deliveryCharge
                        : z?.baseCharge ?? deliverySettings?.defaultCharge ?? 450;
                    const total = base + (a.isRemoteArea ? a.remoteSurcharge || 0 : 0);
                    const minD = a.minDeliveryDays ?? z?.minDeliveryDays ?? 2;
                    const maxD = a.maxDeliveryDays ?? z?.maxDeliveryDays ?? 5;
                    const freeT =
                      a.freeDeliveryThreshold ??
                      z?.freeDeliveryThreshold ??
                      deliverySettings?.globalFreeDeliveryThreshold ??
                      10000;
                    return (
                      <div
                        key={a.id}
                        className="p-4 rounded-xl bg-[#0D0E10] border border-[#C9B27C]/30 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#FCFBF8] text-sm">{a.name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              a.isActive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {a.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-[#B8B9BC]">
                          {a.city}, {a.province} · <span className="text-[#C9B27C]">{z?.name}</span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800 grid grid-cols-2 gap-2 font-mono">
                          <div>
                            <span className="text-[10px] text-neutral-400 block">
                              Delivery Rate
                            </span>
                            <span className="font-bold text-[#C9B27C]">
                              Rs. {total.toLocaleString()}
                            </span>
                            {a.isRemoteArea && (
                              <span className="block text-[10px] text-amber-400">
                                Includes Rs. {a.remoteSurcharge} Remote Fee
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block">
                              Free Above
                            </span>
                            <span className="font-bold text-[#FCFBF8]">
                              Rs. {freeT.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block">COD Status</span>
                            <span
                              className={
                                a.codEnabled && z?.codEnabled !== false
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-rose-400 font-bold'
                              }
                            >
                              {a.codEnabled && z?.codEnabled !== false
                                ? 'COD Available'
                                : 'COD Disabled'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block">Est. Time</span>
                            <span className="text-[#FCFBF8]">
                              {minD}–{maxD} Days
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 5-Tier Priority Hierarchy Reference */}
          <div className="bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9B27C] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Active 5-Tier Delivery Pricing Priority Hierarchy</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              {[
                {
                  step: 'Priority 1',
                  title: 'Product-Specific Rule',
                  desc: 'Fixed charge, surcharge, free delivery, or quote-required set on individual products.',
                },
                {
                  step: 'Priority 2',
                  title: 'Area-Specific Charge',
                  desc: 'Exact rate configured for the customer’s selected Area (e.g. DHA Lahore = Rs. 250).',
                },
                {
                  step: 'Priority 3',
                  title: 'Zone Base Charge',
                  desc: 'Fallback rate from the parent Zone when Area uses zone default.',
                },
                {
                  step: 'Priority 4',
                  title: 'City / Region Default',
                  desc: 'City-level shipping rate if no specific zone matches.',
                },
                {
                  step: 'Priority 5',
                  title: 'Global Default Rate',
                  desc: `Storewide fallback delivery charge (Rs. ${
                    deliverySettings?.defaultCharge || 450
                  }).`,
                },
              ].map((p) => (
                <div
                  key={p.step}
                  className="p-3.5 rounded-xl bg-[#0D0E10] border border-neutral-800 space-y-1"
                >
                  <div className="text-[10px] font-mono font-bold text-[#C9B27C]">{p.step}</div>
                  <div className="font-bold text-white">{p.title}</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DELIVERY ZONES TABLE */}
      {subTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151C2C] p-4 rounded-xl border border-[#C9B27C]/20">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={zoneSearch}
                onChange={(e) => setZoneSearch(e.target.value)}
                placeholder="Search zones by name, code, or province..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'active', 'inactive'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setZoneStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    zoneStatusFilter === st
                      ? 'bg-[#C9B27C] text-[#0D0E10]'
                      : 'bg-[#0D0E10] text-neutral-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                  <th className="py-3.5 px-4">Zone</th>
                  <th className="py-3.5 px-4">Areas</th>
                  <th className="py-3.5 px-4">Base Charge</th>
                  <th className="py-3.5 px-4">Free Delivery</th>
                  <th className="py-3.5 px-4">COD</th>
                  <th className="py-3.5 px-4">Delivery Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filteredZones.map((zone) => {
                  const zoneAreasCount = areas.filter((a) => a.zoneId === zone.id).length;
                  return (
                    <tr key={zone.id} className="hover:bg-[#0D0E10]/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{zone.name}</div>
                        <div className="text-[11px] text-neutral-400">
                          {zone.code} · {zone.province}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZoneFilter(zone.id);
                            setSubTab('areas');
                          }}
                          className="text-[#C9B27C] hover:underline font-bold cursor-pointer"
                        >
                          {zoneAreasCount} Areas →
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        Rs. {zone.baseCharge.toLocaleString()}
                        <span className="block text-[10px] text-neutral-400 font-normal capitalize">
                          {zone.chargeType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-200">
                        {zone.freeDeliveryThreshold
                          ? `Above Rs. ${zone.freeDeliveryThreshold.toLocaleString()}`
                          : 'Global Rule'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            zone.codEnabled ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {zone.codEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-200">
                        {zone.minDeliveryDays}–{zone.maxDeliveryDays} Days
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleZoneActive(zone)}
                          className={`font-bold cursor-pointer ${
                            zone.isActive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {zone.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedZoneFilter(zone.id);
                              setSubTab('areas');
                            }}
                            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] cursor-pointer"
                          >
                            Manage Areas
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditZone(zone)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-[#C9B27C] text-neutral-300 hover:text-black cursor-pointer"
                            title="Edit Zone"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateZone(zone)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                            title="Duplicate Zone"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteZoneConfirm(zone)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DELIVERY AREAS TABLE */}
      {subTab === 'areas' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#151C2C] p-4 rounded-xl border border-[#C9B27C]/20">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder="Search area name, city, or code..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-xs text-white"
                />
              </div>
              <select
                value={selectedZoneFilter}
                onChange={(e) => setSelectedZoneFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-xs text-white"
              >
                <option value="all">All Delivery Zones ({zones.length})</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'active', 'inactive', 'remote'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAreaStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    areaStatusFilter === st
                      ? 'bg-[#C9B27C] text-[#0D0E10]'
                      : 'bg-[#0D0E10] text-neutral-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                  <th className="py-3.5 px-4">Area</th>
                  <th className="py-3.5 px-4">City &amp; Zone</th>
                  <th className="py-3.5 px-4">Charge</th>
                  <th className="py-3.5 px-4">COD</th>
                  <th className="py-3.5 px-4">Delivery Time</th>
                  <th className="py-3.5 px-4">Remote Area</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {filteredAreas.map((area) => {
                  const parentZone = zones.find((z) => z.id === area.zoneId);
                  return (
                    <tr key={area.id} className="hover:bg-[#0D0E10]/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{area.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">{area.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-neutral-200 font-semibold">{area.city}</div>
                        <div className="text-[11px] text-[#C9B27C]">
                          {parentZone?.name || area.zoneName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {area.deliveryCharge !== null && area.deliveryCharge !== undefined ? (
                          <span className="font-bold text-white">
                            Rs. {area.deliveryCharge.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-neutral-400">
                            Zone Rate (Rs. {parentZone?.baseCharge ?? 350})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={
                            area.codEnabled ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                          }
                        >
                          {area.codEnabled ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-200">
                        {area.minDeliveryDays ?? parentZone?.minDeliveryDays ?? 2}–
                        {area.maxDeliveryDays ?? parentZone?.maxDeliveryDays ?? 4} Days
                      </td>
                      <td className="py-3.5 px-4">
                        {area.isRemoteArea ? (
                          <span className="text-amber-400 font-mono font-semibold">
                            ON (+Rs. {area.remoteSurcharge})
                          </span>
                        ) : (
                          <span className="text-neutral-500">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            area.isActive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {area.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditArea(area)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-[#C9B27C] text-neutral-300 hover:text-black cursor-pointer"
                            title="Edit Area"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAreaConfirm(area)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer"
                            title="Delete Area"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CHARGES, WEIGHT BRACKETS, FREE DELIVERY & COD RULES */}
      {subTab === 'rules' && deliverySettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Global Defaults & COD Order Limits */}
          <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-4">
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Global Delivery &amp; COD Order Value Limits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Global Default Delivery Charge (PKR)
                </label>
                <input
                  type="number"
                  value={deliverySettings.defaultCharge}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      defaultCharge: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Global Free Delivery Threshold (PKR)
                </label>
                <input
                  type="number"
                  value={deliverySettings.globalFreeDeliveryThreshold}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      globalFreeDeliveryThreshold: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Minimum COD Order (PKR)</label>
                <input
                  type="number"
                  value={deliverySettings.globalCodMinOrder}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      globalCodMinOrder: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Maximum COD Order (PKR)</label>
                <input
                  type="number"
                  value={deliverySettings.globalCodMaxOrder}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      globalCodMaxOrder: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Heavy / Oversized Threshold (kg)
                </label>
                <input
                  type="number"
                  value={deliverySettings.heavyWeightThresholdKg}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      heavyWeightThresholdKg: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Heavy Order Surcharge (PKR)
                </label>
                <input
                  type="number"
                  value={deliverySettings.heavyFixedSurcharge}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      heavyFixedSurcharge: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-neutral-300 font-semibold">
                  Multi-Product Cart Shipment Mode
                </label>
                <select
                  value={deliverySettings.multiProductShipmentMode}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      multiProductShipmentMode: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  <option value="combined">
                    Combined Shipment (Single consolidated delivery fee)
                  </option>
                  <option value="highest_rule">
                    Highest Applicable Product/Area Delivery Rule
                  </option>
                  <option value="separate">
                    Separate Shipment (Multiply product-specific fixed charges by quantity)
                  </option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveGlobalSettings(deliverySettings)}
              className="w-full py-2.5 rounded-xl bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Global Delivery & COD Rules'}
            </button>
          </div>

          {/* Weight-Based Delivery Brackets */}
          <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-4">
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Weight-Based Delivery Brackets
            </h3>
            <p className="text-xs text-[#B8B9BC]">
              Used when a Zone or Area has Charge Method set to &ldquo;Weight Based&rdquo;.
            </p>

            <div className="space-y-2.5 text-xs">
              {(deliverySettings.weightBrackets || []).map((b, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-2 items-center bg-[#0D0E10] p-2.5 rounded-lg border border-neutral-800"
                >
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Min (kg)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={b.minKg}
                      onChange={(e) => {
                        const next = [...deliverySettings.weightBrackets];
                        next[idx] = { ...b, minKg: Number(e.target.value) };
                        setDeliverySettings({ ...deliverySettings, weightBrackets: next });
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Max (kg)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={b.maxKg}
                      onChange={(e) => {
                        const next = [...deliverySettings.weightBrackets];
                        next[idx] = { ...b, maxKg: Number(e.target.value) };
                        setDeliverySettings({ ...deliverySettings, weightBrackets: next });
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Charge (PKR)</span>
                    <input
                      type="number"
                      value={b.charge}
                      onChange={(e) => {
                        const next = [...deliverySettings.weightBrackets];
                        next[idx] = { ...b, charge: Number(e.target.value) };
                        setDeliverySettings({ ...deliverySettings, weightBrackets: next });
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[#C9B27C] font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSaveGlobalSettings(deliverySettings)}
              className="w-full py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 font-bold text-xs uppercase cursor-pointer"
            >
              Save Weight Brackets
            </button>
          </div>

          {/* Free Delivery Rules */}
          <div className="lg:col-span-2 bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-4">
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Conditional Free-Delivery Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule Name (e.g. Free Lahore Delivery > Rs. 5,000)"
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
              />
              <input
                type="number"
                value={newRuleMinOrder}
                onChange={(e) => setNewRuleMinOrder(Number(e.target.value) || 0)}
                placeholder="Min Order PKR"
                className="px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
              />
              <div className="flex gap-2">
                <select
                  value={newRuleZoneId}
                  onChange={(e) => setNewRuleZoneId(e.target.value)}
                  className="flex-1 px-2 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  <option value="all">All Zones</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newRuleName.trim()) return;
                    const rule: FreeDeliveryRule = {
                      id: `fdr-${Date.now()}`,
                      name: newRuleName.trim(),
                      minOrderValue: newRuleMinOrder,
                      zoneIds: newRuleZoneId === 'all' ? undefined : [newRuleZoneId],
                      isActive: true,
                    };
                    const updated = {
                      ...deliverySettings,
                      freeDeliveryRules: [...(deliverySettings.freeDeliveryRules || []), rule],
                    };
                    handleSaveGlobalSettings(updated);
                    setNewRuleName('');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {(deliverySettings.freeDeliveryRules || []).map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-[#0D0E10] border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{r.name}</span>
                    <span className="text-neutral-400 ml-3 font-mono">
                      Min Order: Rs. {r.minOrderValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = deliverySettings.freeDeliveryRules.map((x) =>
                          x.id === r.id ? { ...x, isActive: !x.isActive } : x
                        );
                        handleSaveGlobalSettings({
                          ...deliverySettings,
                          freeDeliveryRules: next,
                        });
                      }}
                      className={`font-bold cursor-pointer ${
                        r.isActive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = deliverySettings.freeDeliveryRules.filter(
                          (x) => x.id !== r.id
                        );
                        handleSaveGlobalSettings({
                          ...deliverySettings,
                          freeDeliveryRules: next,
                        });
                      }}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PRODUCT-SPECIFIC DELIVERY & INSTALLATION RULES */}
      {subTab === 'product-rules' && (
        <div className="bg-[#151C2C] rounded-2xl border border-[#C9B27C]/25 p-6 space-y-4">
          <div>
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Product-Specific Delivery, Weight &amp; Installation Rules (Priority 1)
            </h3>
            <p className="text-xs text-[#B8B9BC]">
              Configure special transportation charges, free delivery, quote-required mode, or
              separate installation charges for Solar Panels, Inverters, Hobs, Hoods, and EV Bikes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-[#C9B27C] uppercase text-[11px]">
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Weight (kg)</th>
                  <th className="py-3 px-3">Delivery Rule (Priority 1)</th>
                  <th className="py-3 px-3">Fixed / Surcharge (PKR)</th>
                  <th className="py-3 px-3">Installation</th>
                  <th className="py-3 px-3">Installation Fee (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {products.slice(0, 25).map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#0D0E10]/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white truncate max-w-xs">{prod.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {prod.sku} · {prod.categoryName}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={prod.weightKg ?? 2}
                        onBlur={(e) =>
                          handleUpdateProductDeliveryRule(prod, {
                            weightKg: Number(e.target.value) || 1,
                          })
                        }
                        className="w-20 px-2 py-1 rounded bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={prod.deliveryRuleType || 'standard'}
                        onChange={(e) =>
                          handleUpdateProductDeliveryRule(prod, {
                            deliveryRuleType: e.target.value as any,
                          })
                        }
                        className="px-2.5 py-1.5 rounded bg-[#0D0E10] border border-neutral-700 text-white"
                      >
                        <option value="standard">Standard Zone/Area Rule</option>
                        <option value="free">Free Delivery</option>
                        <option value="fixed">Fixed Delivery Charge</option>
                        <option value="surcharge">Additional Heavy Surcharge</option>
                        <option value="quote_required">Quote Required</option>
                        <option value="unavailable">Delivery Unavailable</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        defaultValue={prod.deliveryFixedCharge ?? prod.deliverySurcharge ?? 0}
                        onBlur={(e) => {
                          const val = Number(e.target.value) || 0;
                          handleUpdateProductDeliveryRule(prod, {
                            deliveryFixedCharge: val,
                            deliverySurcharge: val,
                          });
                        }}
                        className="w-24 px-2 py-1 rounded bg-[#0D0E10] border border-neutral-700 text-[#C9B27C] font-mono font-bold"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={Boolean(prod.installationAvailable)}
                        onChange={(e) =>
                          handleUpdateProductDeliveryRule(prod, {
                            installationAvailable: e.target.checked,
                          })
                        }
                        className="accent-[#C9B27C] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        defaultValue={prod.installationCharge ?? 1500}
                        onBlur={(e) =>
                          handleUpdateProductDeliveryRule(prod, {
                            installationCharge: Number(e.target.value) || 0,
                          })
                        }
                        className="w-24 px-2 py-1 rounded bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: CUT-OFF TIME, WORKING DAYS & HOLIDAYS */}
      {subTab === 'schedule' && deliverySettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-4">
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Daily Order Cut-Off &amp; Working Days
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Daily Same-Day Dispatch Cut-Off
                </label>
                <input
                  type="time"
                  value={deliverySettings.cutoffTime || '16:00'}
                  onChange={(e) =>
                    setDeliverySettings({ ...deliverySettings, cutoffTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Timezone</label>
                <input
                  type="text"
                  value={deliverySettings.timezone || 'Asia/Karachi'}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-800 text-neutral-400 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-neutral-300">Active Working Days</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(
                  [
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday',
                  ] as const
                ).map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0D0E10] border border-neutral-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(deliverySettings.workingDays?.[day])}
                      onChange={(e) =>
                        setDeliverySettings({
                          ...deliverySettings,
                          workingDays: {
                            ...deliverySettings.workingDays,
                            [day]: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#C9B27C]"
                    />
                    <span className="text-white">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSaveGlobalSettings(deliverySettings)}
              className="w-full py-2.5 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold text-xs uppercase cursor-pointer"
            >
              Save Dispatch Schedule
            </button>
          </div>

          <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-4">
            <h3 className="font-luxury-serif text-lg font-semibold text-[#FCFBF8]">
              Configured Holidays
            </h3>
            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="Holiday Name (e.g. Eid-ul-Fitr)"
                className="flex-1 px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
              />
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newHolidayName.trim() || !newHolidayDate) return;
                  const hol: DeliveryHoliday = {
                    id: `hol-${Date.now()}`,
                    name: newHolidayName.trim(),
                    holidayDate: newHolidayDate,
                    isActive: true,
                  };
                  handleSaveGlobalSettings({
                    ...deliverySettings,
                    holidays: [...(deliverySettings.holidays || []), hol],
                  });
                  setNewHolidayName('');
                  setNewHolidayDate('');
                }}
                className="px-4 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(deliverySettings.holidays || []).map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-[#0D0E10] border border-neutral-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white">{h.name}</span>
                    <span className="ml-3 font-mono text-[#C9B27C]">{h.holidayDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = deliverySettings.holidays.filter((x) => x.id !== h.id);
                      handleSaveGlobalSettings({ ...deliverySettings, holidays: next });
                    }}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: DELIVERY REPORTS */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Delivery Charges Collected</div>
              <div className="text-2xl font-bold text-[#C9B27C] font-mono mt-1">
                Rs. {(reports?.totalDeliveryRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Avg. Rs. {(reports?.averageDeliveryCharge || 0).toLocaleString()} per order
              </div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Free Delivery Orders</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {reports?.freeDeliveryOrders || 0}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Paid Delivery Orders: {reports?.paidDeliveryOrders || 0}
              </div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Remote-Area Orders</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {reports?.remoteAreaOrders || 0}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Admin Overrides: {reports?.overrideOrders || 0}
              </div>
            </div>
            <div className="bg-[#151C2C] p-5 rounded-2xl border border-[#C9B27C]/25">
              <div className="text-[11px] text-[#B8B9BC] uppercase">Installation Revenue</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                Rs. {(reports?.totalInstallationRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Separate from standard courier fees
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-3">
              <h4 className="font-luxury-serif text-base font-semibold text-white">
                Orders &amp; Delivery Revenue by Zone
              </h4>
              <div className="space-y-2 text-xs">
                {Object.entries(reports?.byZone || {}).map(([zName, stat]: [string, any]) => (
                  <div
                    key={zName}
                    className="p-3 rounded-xl bg-[#0D0E10] border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white">{zName}</span>
                      <span className="text-neutral-400 ml-2">
                        ({stat.orders} orders · {stat.freeOrders} free)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#C9B27C]">
                      Rs. {Number(stat.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#151C2C] p-6 rounded-2xl border border-[#C9B27C]/25 space-y-3">
              <h4 className="font-luxury-serif text-base font-semibold text-white">
                Orders &amp; Delivery Revenue by Area
              </h4>
              <div className="space-y-2 text-xs">
                {Object.entries(reports?.byArea || {}).map(([aName, stat]: [string, any]) => (
                  <div
                    key={aName}
                    className="p-3 rounded-xl bg-[#0D0E10] border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white">{aName}</span>
                      <span className="text-neutral-400 ml-2">({stat.orders} orders)</span>
                    </div>
                    <span className="font-mono font-bold text-[#C9B27C]">
                      Rs. {Number(stat.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ZONE */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveZone}
            className="bg-[#151C2C] border border-[#C9B27C] rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-luxury-serif text-lg font-bold text-[#C9B27C]">
                {editingZone ? `Edit ${editingZone.name}` : 'Create Delivery Zone'}
              </h3>
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-neutral-300 font-semibold">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={zName}
                  onChange={(e) => setZName(e.target.value)}
                  placeholder="e.g. Zone 1 — Lahore"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Zone Code *</label>
                <input
                  type="text"
                  required
                  value={zCode}
                  onChange={(e) => setZCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Province / Region</label>
                <select
                  value={zProvince}
                  onChange={(e) => setZProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  {PAKISTAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Charge Method</label>
                <select
                  value={zChargeType}
                  onChange={(e) => setZChargeType(e.target.value as DeliveryChargeMethod)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  <option value="fixed">Fixed Charge (PKR)</option>
                  <option value="percentage">Percentage of Order Subtotal</option>
                  <option value="weight_based">Weight Based Brackets</option>
                  <option value="quantity_based">Quantity Based Brackets</option>
                  <option value="order_value_based">Order Value Brackets</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Base Delivery Charge (PKR)</label>
                <input
                  type="number"
                  value={zBaseCharge}
                  onChange={(e) => setZBaseCharge(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-[#C9B27C] font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Free Delivery Threshold (PKR)
                </label>
                <input
                  type="number"
                  value={zFreeThreshold}
                  onChange={(e) => setZFreeThreshold(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Base Installation Fee (PKR)</label>
                <input
                  type="number"
                  value={zInstallCharge}
                  onChange={(e) => setZInstallCharge(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Est. Min Delivery Days</label>
                <input
                  type="number"
                  value={zMinDays}
                  onChange={(e) => setZMinDays(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Est. Max Delivery Days</label>
                <input
                  type="number"
                  value={zMaxDays}
                  onChange={(e) => setZMaxDays(Number(e.target.value) || 3)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Min COD Order (PKR)</label>
                <input
                  type="number"
                  value={zCodMin}
                  onChange={(e) => setZCodMin(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Max COD Order (PKR)</label>
                <input
                  type="number"
                  value={zCodMax}
                  onChange={(e) => setZCodMax(Number(e.target.value) || 100000)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-4 sm:col-span-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zCodEnabled}
                    onChange={(e) => setZCodEnabled(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span className="font-semibold">COD Available in Zone</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zActive}
                    onChange={(e) => setZActive(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span className="font-semibold">Zone Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Delivery Zone'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT AREA */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveArea}
            className="bg-[#151C2C] border border-[#C9B27C] rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-luxury-serif text-lg font-bold text-[#C9B27C]">
                {editingArea ? `Edit Area: ${editingArea.name}` : 'Add Delivery Area'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-neutral-300 font-semibold">Assign to Delivery Zone *</label>
                <select
                  value={aZoneId}
                  onChange={(e) => setAZoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} (Base: Rs. {z.baseCharge})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Area Name *</label>
                <input
                  type="text"
                  required
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  placeholder="e.g. DHA Phase 6, Gulberg, Johar Town"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Area Code</label>
                <input
                  type="text"
                  value={aCode}
                  onChange={(e) => setACode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">City *</label>
                <input
                  type="text"
                  required
                  value={aCity}
                  onChange={(e) => setACity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Province</label>
                <select
                  value={aProvince}
                  onChange={(e) => setAProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  {PAKISTAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Area Delivery Charge (Leave blank to use Zone Rate)
                </label>
                <input
                  type="number"
                  value={aCharge}
                  onChange={(e) => setACharge(e.target.value)}
                  placeholder="Fallback to Zone Base Charge"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-[#C9B27C] font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Area Free Delivery Threshold (Optional)
                </label>
                <input
                  type="number"
                  value={aFreeThreshold}
                  onChange={(e) => setAFreeThreshold(e.target.value)}
                  placeholder="Fallback to Zone Threshold"
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Remote Area Surcharge (PKR)</label>
                <input
                  type="number"
                  value={aRemoteSurcharge}
                  onChange={(e) => setARemoteSurcharge(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-amber-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Postal Code (Optional)</label>
                <input
                  type="text"
                  value={aPostalCode}
                  onChange={(e) => setAPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:col-span-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aCodEnabled}
                    onChange={(e) => setACodEnabled(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span className="font-semibold">COD Available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aRemote}
                    onChange={(e) => setARemote(e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span className="font-semibold text-amber-300">Remote Area = ON</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aActive}
                    onChange={(e) => setAActive(e.target.checked)}
                    className="accent-[#C9B27C]"
                  />
                  <span className="font-semibold">Area Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Delivery Area'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: BULK ADD AREAS */}
      {isBulkAreaOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleBulkCreateAreas}
            className="bg-[#151C2C] border border-[#C9B27C] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-luxury-serif text-lg font-bold text-[#C9B27C]">
                Bulk Add Multiple Delivery Areas
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkAreaOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-neutral-300 font-semibold">Target Zone</label>
                <select
                  value={bulkZoneId}
                  onChange={(e) => setBulkZoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">City</label>
                <input
                  type="text"
                  value={bulkCity}
                  onChange={(e) => setBulkCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Delivery Charge (PKR or blank)
                </label>
                <input
                  type="number"
                  value={bulkCharge}
                  onChange={(e) => setBulkCharge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-[#C9B27C] font-mono"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Enter Area Names (One per line)
                </label>
                <textarea
                  rows={6}
                  value={bulkLinesText}
                  onChange={(e) => setBulkLinesText(e.target.value)}
                  placeholder={'Valencia Town\nLake City\nFaisal Town\nIqbal Town\nShadman'}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D0E10] border border-neutral-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsBulkAreaOpen(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-bold cursor-pointer"
              >
                {saving ? 'Adding...' : 'Bulk Create Areas'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE ZONE CONFIRMATION */}
      {deleteZoneConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs text-white">
            <h4 className="text-base font-bold text-rose-400">
              Delete delivery zone &ldquo;{deleteZoneConfirm.name}&rdquo;?
            </h4>
            <p className="text-neutral-300">
              Historical orders using this zone will keep their saved delivery snapshot unchanged.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteZoneConfirm(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteZone}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Delete Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE AREA CONFIRMATION */}
      {deleteAreaConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#151C2C] border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs text-white">
            <h4 className="text-base font-bold text-rose-400">
              Delete delivery area &ldquo;{deleteAreaConfirm.name}&rdquo;?
            </h4>
            <p className="text-neutral-300">
              Existing orders placed for this area will retain their original delivery charge
              snapshot.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAreaConfirm(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteArea}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
              >
                Delete Area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
