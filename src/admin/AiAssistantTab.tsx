import React, { useState, useEffect } from 'react';
import type { StoreSettings, Product, Category, Brand } from '../types/index.ts';
import { saveSettingsInSupabase } from '../lib/supabaseClient.ts';
import { safeJsonResponse } from '../utils/api.ts';
import {
  Sparkles,
  Power,
  MessageSquare,
  ShieldCheck,
  Database,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Eye,
  Lock,
  Sliders,
  Send,
  Bot,
  AlertCircle,
} from 'lucide-react';

interface AiAssistantTabProps {
  settings: StoreSettings;
  onUpdateSettings: (updated: StoreSettings) => void;
  products: Product[];
  categories: Category[];
  partners: Brand[];
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  'Best solar inverter for a 5kW home system?',
  'Do you have kitchen hoods in stock?',
  'Which EV bike has the longest range?',
  'Show me sanitary products under PKR 25,000',
  'Track my recent order status',
];

const DEFAULT_SYSTEM_INSTRUCTIONS =
  'Act as an executive, helpful, and technically accurate luxury showroom advisor for M.A. GROUP OF COMPANIES. Recommend only verified products from our live catalog, quote accurate PKR prices and stock status, highlight warranty and official partner certifications, and ask clarifying questions when sizing solar or electrical systems.';

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  settings,
  onUpdateSettings,
  products,
  categories,
  partners,
  notify,
}) => {
  const [enabled, setEnabled] = useState<boolean>(settings.aiAssistantEnabled ?? true);
  const [welcomeMessage, setWelcomeMessage] = useState<string>(
    settings.aiWelcomeMessage || "Hello! I'm M.A. SMART ASSISTANT. How can I help you today?"
  );
  const [tagline, setTagline] = useState<string>(
    settings.aiTagline || 'Your intelligent shopping assistant.'
  );
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    settings.aiSuggestedQuestions && settings.aiSuggestedQuestions.length > 0
      ? settings.aiSuggestedQuestions
      : DEFAULT_SUGGESTED_QUESTIONS
  );
  const [newQuestion, setNewQuestion] = useState('');
  const [systemInstructions, setSystemInstructions] = useState<string>(
    settings.aiSystemInstructions || DEFAULT_SYSTEM_INSTRUCTIONS
  );
  const [maxRecommendations, setMaxRecommendations] = useState<number>(
    settings.aiMaxRecommendations ?? 4
  );
  const [accessCatalog, setAccessCatalog] = useState<boolean>(
    settings.aiAccessProductCatalog !== false
  );
  const [accessOrders, setAccessOrders] = useState<boolean>(
    settings.aiAccessCustomerOrders !== false
  );
  const [isSaving, setIsSaving] = useState(false);

  // Live Playground Simulator state
  const [testPrompt, setTestPrompt] = useState('');
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testRecIds, setTestRecIds] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setEnabled(settings.aiAssistantEnabled ?? true);
    setWelcomeMessage(
      settings.aiWelcomeMessage || "Hello! I'm M.A. SMART ASSISTANT. How can I help you today?"
    );
    setTagline(settings.aiTagline || 'Your intelligent shopping assistant.');
    setSuggestedQuestions(
      settings.aiSuggestedQuestions && settings.aiSuggestedQuestions.length > 0
        ? settings.aiSuggestedQuestions
        : DEFAULT_SUGGESTED_QUESTIONS
    );
    setSystemInstructions(settings.aiSystemInstructions || DEFAULT_SYSTEM_INSTRUCTIONS);
    setMaxRecommendations(settings.aiMaxRecommendations ?? 4);
    setAccessCatalog(settings.aiAccessProductCatalog !== false);
    setAccessOrders(settings.aiAccessCustomerOrders !== false);
  }, [settings]);

  const persistAiSettings = async (override?: Partial<StoreSettings>) => {
    setIsSaving(true);
    const updatedSettings: StoreSettings = {
      ...settings,
      aiAssistantEnabled: enabled,
      aiWelcomeMessage:
        welcomeMessage.trim() || "Hello! I'm M.A. SMART ASSISTANT. How can I help you today?",
      aiTagline: tagline.trim() || 'Your intelligent shopping assistant.',
      aiSuggestedQuestions: suggestedQuestions.filter((q) => q.trim().length > 0),
      aiSystemInstructions: systemInstructions.trim() || DEFAULT_SYSTEM_INSTRUCTIONS,
      aiMaxRecommendations: Math.max(1, Math.min(8, Number(maxRecommendations) || 4)),
      aiAccessProductCatalog: accessCatalog,
      aiAccessCustomerOrders: accessOrders,
      ...override,
    };

    try {
      const token = localStorage.getItem('ma_admin_token') || localStorage.getItem('adminToken') || '';
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedSettings),
      });

      const saved = await safeJsonResponse(res, updatedSettings);
      await saveSettingsInSupabase(saved);
      onUpdateSettings(saved);
      notify('M.A. SMART ASSISTANT settings saved and synced to Supabase.', 'success');
    } catch (err) {
      await saveSettingsInSupabase(updatedSettings);
      onUpdateSettings(updatedSettings);
      notify('M.A. SMART ASSISTANT settings saved.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMasterSwitch = async () => {
    const nextState = !enabled;
    setEnabled(nextState);
    await persistAiSettings({ aiAssistantEnabled: nextState });
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    if (suggestedQuestions.includes(trimmed)) {
      notify('This suggested question already exists.', 'error');
      return;
    }
    setSuggestedQuestions([...suggestedQuestions, trimmed]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setSuggestedQuestions(suggestedQuestions.filter((_, i) => i !== idx));
  };

  const handleResetDefaults = () => {
    setWelcomeMessage("Hello! I'm M.A. SMART ASSISTANT. How can I help you today?");
    setTagline('Your intelligent shopping assistant.');
    setSuggestedQuestions(DEFAULT_SUGGESTED_QUESTIONS);
    setSystemInstructions(DEFAULT_SYSTEM_INSTRUCTIONS);
    setMaxRecommendations(4);
    setAccessCatalog(true);
    setAccessOrders(true);
    notify('Defaults restored. Click Save Configuration to apply.', 'success');
  };

  const handleRunTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim() || isTesting) return;
    setIsTesting(true);
    setTestReply(null);
    setTestRecIds([]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testPrompt.trim(),
          history: [],
        }),
      });
      const data = await safeJsonResponse(res, {
        reply: 'Could not reach M.A. SMART ASSISTANT.',
        recommendedProductIds: [],
      });
      setTestReply(data.reply || 'No response received.');
      setTestRecIds(Array.isArray(data.recommendedProductIds) ? data.recommendedProductIds : []);
    } catch (err) {
      setTestReply('Error testing assistant response.');
    } finally {
      setIsTesting(false);
    }
  };

  const visibleProductsCount = products.filter((p) => p.isVisible !== false).length;
  const visibleCategoriesCount = categories.filter((c) => c.isVisible !== false).length;
  const visiblePartnersCount = partners.filter((p) => p.isVisible !== false).length;

  return (
    <div className="space-y-8">
      {/* Top Executive Header & Master ON/OFF Banner */}
      <div className="rounded-2xl bg-[#0D0E10] text-white p-6 sm:p-8 border border-[#C9B27C]/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#C9B27C]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9B27C]/15 border border-[#C9B27C]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9B27C]">
                AI Concierge & Storefront Intelligence
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#FCFBF8]">
              M.A. SMART ASSISTANT
            </h2>
            <p className="text-sm text-[#B8B9BC] leading-relaxed">
              Manage your real-time AI shopping assistant grounded in live Supabase products, categories,
              certified manufacturing partners, and authenticated customer order status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#151C2C] p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 pr-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  enabled
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                }`}
              />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[#B8B9BC] font-semibold">
                  Assistant Status
                </div>
                <div className="text-sm font-bold text-white">
                  {enabled ? 'ACTIVE ON STOREFRONT' : 'HIDDEN ON STOREFRONT'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMasterSwitch}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                enabled
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                  : 'bg-[#C9B27C] text-[#0D0E10] hover:bg-[#A98B52]'
              }`}
            >
              <Power className="w-4 h-4" />
              {enabled ? 'Turn Assistant OFF' : 'Turn Assistant ON'}
            </button>
          </div>
        </div>

        {/* Live Supabase Grounding Telemetry */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-[#B8B9BC]">Live Grounded Products</div>
            <div className="text-xl font-bold text-[#C9B27C] mt-0.5">{visibleProductsCount} Active SKUs</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-[#B8B9BC]">Active Categories</div>
            <div className="text-xl font-bold text-[#FCFBF8] mt-0.5">{visibleCategoriesCount} Categories</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-[#B8B9BC]">Certified Partners</div>
            <div className="text-xl font-bold text-[#FCFBF8] mt-0.5">{visiblePartnersCount} Manufacturers</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-[#B8B9BC]">Order Privacy Guard</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Authenticated Only
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Identity, Prompts & Capabilities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity & Greeting Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assistant Identity & Welcome Experience
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize how M.A. SMART ASSISTANT greets customers on the storefront.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#F7F3EA] text-[#A98B52] border border-[#C9B27C]/30">
                M.A. SMART ASSISTANT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Official Assistant Name
                </label>
                <input
                  type="text"
                  value="M.A. SMART ASSISTANT"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Assistant Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your intelligent shopping assistant."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-[#151C2C] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Welcome Message
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Hello! I'm M.A. SMART ASSISTANT. How can I help you today?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-[#151C2C] outline-none"
              />
            </div>

            {/* Suggested Quick Prompts */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Suggested Customer Questions (Quick Starters)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  placeholder="e.g., Suggest a 10kW hybrid solar inverter in stock"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-[#151C2C] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 rounded-xl bg-[#151C2C] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#0D0E10] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#C9B27C]" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {suggestedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#F7F3EA]/60 border border-[#C9B27C]/30 text-xs text-slate-800"
                  >
                    <span className="font-medium">{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grounding, Privacy & Behavior Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#151C2C] text-[#C9B27C] flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supabase Data Access, Privacy & AI Behavior
                </h3>
                <p className="text-xs text-slate-500">
                  Control what live data M.A. SMART ASSISTANT can read and how it responds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#A98B52]" />
                    Live Product & Partner Grounding
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Allow assistant to read live prices, stock status, SKUs, categories, and certified manufacturing partners.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={accessCatalog}
                  onChange={(e) => setAccessCatalog(e.target.checked)}
                  className="w-5 h-5 accent-[#151C2C] rounded cursor-pointer mt-1"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    Authenticated Order Tracking
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Allow logged-in customers to ask about their own order status & payment status. Never leaks other users&apos; orders.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={accessOrders}
                  onChange={(e) => setAccessOrders(e.target.checked)}
                  className="w-5 h-5 accent-[#151C2C] rounded cursor-pointer mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Max Product Cards per Response
                </label>
                <select
                  value={maxRecommendations}
                  onChange={(e) => setMaxRecommendations(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-[#151C2C]"
                >
                  <option value={2}>Up to 2 Products</option>
                  <option value={3}>Up to 3 Products</option>
                  <option value={4}>Up to 4 Products (Recommended)</option>
                  <option value={6}>Up to 6 Products</option>
                </select>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-900 leading-relaxed">
                  <strong>Strict Anti-Hallucination Guard:</strong> Hidden products, hidden categories, and admin credentials are strictly excluded from AI context.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Custom Executive System Instructions / Tone Guidelines
              </label>
              <textarea
                rows={4}
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
                placeholder={DEFAULT_SYSTEM_INSTRUCTIONS}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-[#151C2C] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Restore Defaults
              </button>

              <button
                type="button"
                onClick={() => persistAiSettings()}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#0D0E10] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#C9B27C]" />
                {isSaving ? 'Saving to Supabase...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Storefront Preview & Simulator */}
        <div className="space-y-6">
          {/* Storefront Widget Preview Card */}
          <div className="bg-[#0D0E10] rounded-2xl border border-[#C9B27C]/30 overflow-hidden shadow-lg">
            <div className="p-4 bg-[#151C2C] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C9B27C]/20 border border-[#C9B27C]/40 flex items-center justify-center text-[#C9B27C]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    M.A. SMART ASSISTANT
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-[#C9B27C]">{tagline}</div>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/70">
                Live Preview
              </span>
            </div>

            <div className="p-4 bg-[#F7F3EA] space-y-3">
              <div className="bg-[#FCFBF8] p-3.5 rounded-2xl rounded-tl-sm border border-[#B8B9BC]/30 text-xs text-[#292B30] shadow-xs leading-relaxed">
                {welcomeMessage}
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Prompts Shown to Customers:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQuestions.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTestPrompt(q)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-[#C9B27C]/40 text-[#151C2C] hover:bg-[#151C2C] hover:text-white transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Interactive Test Simulator */}
            <div className="p-4 bg-[#0D0E10] border-t border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#C9B27C] uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Test Assistant Response
              </div>
              <form onSubmit={handleRunTestQuery} className="flex gap-2">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Ask a test question..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#C9B27C]"
                />
                <button
                  type="submit"
                  disabled={isTesting || !testPrompt.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#C9B27C] text-[#0D0E10] font-bold text-xs hover:bg-[#A98B52] disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isTesting ? '...' : 'Test'}
                </button>
              </form>

              {testReply && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#FCFBF8] space-y-2 max-h-60 overflow-y-auto">
                  <div className="whitespace-pre-line leading-relaxed">{testReply}</div>
                  {testRecIds.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-[10px] uppercase tracking-wider text-[#C9B27C] font-bold mb-1">
                        Matched Catalog Products ({testRecIds.length}):
                      </div>
                      <div className="space-y-1">
                        {testRecIds.map((id) => {
                          const prod = products.find((p) => p.id === id);
                          if (!prod) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between text-[11px] bg-white/5 px-2.5 py-1.5 rounded-lg"
                            >
                              <span className="font-medium text-white truncate pr-2">{prod.name}</span>
                              <span className="text-[#C9B27C] font-bold shrink-0">
                                PKR {(prod.discountPrice || prod.price).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Security & Privacy Guarantee Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#151C2C]">
              <AlertCircle className="w-4 h-4 text-[#A98B52]" />
              Security & Privacy Architecture
            </div>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Never exposes private data of other customers or unauthenticated orders.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Never exposes admin passwords, API keys, or hidden database records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Automatically excludes products or categories with Visibility switched OFF.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
