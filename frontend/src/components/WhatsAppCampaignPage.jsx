/**
 * StockSaathi AI — WhatsApp Clearance Campaign Page (Phase 9)
 *
 * Full-screen dedicated workspace for generating, customizing, copying,
 * and archiving profit-safe WhatsApp promotional broadcasts for retail customers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Package,
  Layers,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  Plus,
  AlertTriangle,
  ExternalLink,
  Archive,
  Save,
  CheckCircle2,
} from 'lucide-react';
import {
  generateCampaign,
  fetchCampaigns,
  updateCampaign,
  archiveCampaign,
} from '../services/campaignApi.js';
import { fetchProducts } from '../services/inventoryApi.js';
import { calculateMinimumSafePrice } from '../services/discountApi.js';
import CampaignHistoryTable from './CampaignHistoryTable.jsx';
import CampaignGeneratorModal from './CampaignGeneratorModal.jsx';

export default function WhatsAppCampaignPage({ onNavigate }) {
  // Inventory state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Form parameters
  const [campaignType, setCampaignType] = useState('flash_sale');
  const [targetAudience, setTargetAudience] = useState('all_customers');
  const [language, setLanguage] = useState('english');
  const [tone, setTone] = useState('friendly');
  const [discountPercent, setDiscountPercent] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [campaignName, setCampaignName] = useState('');

  // Price floor safety
  const [priceFloorInfo, setPriceFloorInfo] = useState(null);
  const [loadingFloor, setLoadingFloor] = useState(false);

  // Active Draft / Generated Campaign state
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [editableMessage, setEditableMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Campaign History State
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    status: 'all',
    campaignType: 'all',
    language: 'all',
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);

  // Load Inventory Products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetchProducts({ limit: 100 });
      const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
      setProducts(list);
      if (list.length > 0 && !selectedProductId) {
        setSelectedProductId(list[0]._id || list[0].id);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedProductId]);

  // Load Campaigns History
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetchCampaigns({
        page,
        limit: 10,
        status: historyFilters.status,
        campaignType: historyFilters.campaignType,
        language: historyFilters.language,
      });
      if (res.success) {
        setCampaigns(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        // If no active campaign yet, set the latest one as preview
        if (!activeCampaign && res.data && res.data.length > 0) {
          setActiveCampaign(res.data[0]);
          setEditableMessage(res.data[0].message);
        }
      }
    } catch (err) {
      console.warn('Could not load campaign history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters, activeCampaign]);

  useEffect(() => {
    loadProducts();
    loadHistory(1);
  }, [loadProducts, loadHistory]);

  const activeProduct = products.find((p) => (p._id || p.id) === selectedProductId) || null;

  // Re-calculate price floor when active product changes
  useEffect(() => {
    if (!activeProduct) {
      setPriceFloorInfo(null);
      return;
    }

    setLoadingFloor(true);
    calculateMinimumSafePrice({
      productId: activeProduct._id || activeProduct.id,
      purchaseCost: activeProduct.purchaseCost,
      sellingPrice: activeProduct.sellingPrice,
      constraintType: activeProduct.minimumDesiredProfitPerUnit > 0 ? 'minimum_profit' : 'minimum_margin',
      minimumDesiredProfitPerUnit: activeProduct.minimumDesiredProfitPerUnit || 0,
      minimumGrossMarginPercent: activeProduct.minimumGrossMarginPercent || 15,
    })
      .then((res) => {
        if (res.success) setPriceFloorInfo(res.data);
      })
      .catch(() => setPriceFloorInfo(null))
      .finally(() => setLoadingFloor(false));
  }, [activeProduct]);

  // Generate Campaign Handler
  const handleGenerateCampaign = async () => {
    if (!selectedProductId) {
      setError('Please select an inventory product.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const payload = {
        productId: selectedProductId,
        campaignType,
        targetAudience,
        language,
        tone,
        customInstructions,
        campaignName: campaignName.trim() || undefined,
      };

      if (discountPercent !== '' && !Number.isNaN(Number(discountPercent))) {
        payload.discountPercent = Number(discountPercent);
      }

      const res = await generateCampaign(payload);
      if (res.success) {
        setActiveCampaign(res.data);
        setEditableMessage(res.data.message);
        loadHistory(1);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate promotional message');
    } finally {
      setGenerating(false);
    }
  };

  // Save Message Edits / Update Draft
  const handleSaveEdits = async (newStatus = null) => {
    if (!activeCampaign?._id) return;
    setSavingDraft(true);

    try {
      const payload = { message: editableMessage };
      if (newStatus) payload.status = newStatus;

      const res = await updateCampaign(activeCampaign._id, payload);
      if (res.success) {
        setActiveCampaign(res.data);
        loadHistory(pagination.page);
      }
    } catch (err) {
      alert(`Could not save campaign: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  // Copy Message to Clipboard
  const handleCopyMessage = async () => {
    if (!editableMessage) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(editableMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Archive Campaign Handler
  const handleArchive = async (id) => {
    try {
      await archiveCampaign(id);
      loadHistory(pagination.page);
      if (activeCampaign?._id === id) {
        setActiveCampaign((prev) => (prev ? { ...prev, status: 'archived' } : prev));
      }
    } catch (err) {
      alert(`Archive failed: ${err.message}`);
    }
  };

  const maxSafeDiscount = priceFloorInfo?.maximumSafeDiscountPercent ?? 0;
  const minSafePrice = priceFloorInfo?.minimumAcceptablePrice ?? 0;

  // KPI Calculations
  const draftCount = campaigns.filter((c) => c.status === 'draft').length;
  const readyCount = campaigns.filter((c) => c.status === 'ready').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Phase 9 • WhatsApp Generator
            </span>
            <span className="text-xs text-slate-400 font-medium">• Multi-Language Copywriting</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-600 fill-emerald-600" />
            Personalized WhatsApp Clearance Campaign Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Create profit-safe broadcast templates in English, Hindi, and Hinglish to turn dead inventory into liquid cash.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              loadProducts();
              loadHistory(1);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Quick Campaign Modal
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Campaigns</span>
          <div className="text-2xl font-bold text-slate-900">{pagination.total || campaigns.length}</div>
          <p className="text-[11px] text-slate-400">Generated across all catalog items</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Drafts</span>
          <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
          <p className="text-[11px] text-slate-400">Editable promotional drafts</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ready for Broadcast</span>
          <div className="text-2xl font-bold text-emerald-600">{readyCount}</div>
          <p className="text-[11px] text-slate-400">Confirmed profit-safe messages</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Profit Safeguards</span>
          <div className="text-2xl font-bold text-blue-600 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>100% Protected</span>
          </div>
          <p className="text-[11px] text-slate-400">Enforced mathematical price floors</p>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Campaign Safeguard Notice</h4>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ── Main Workspace: Composer Panel & Live Message Preview ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 Cols): Configuration Controls */}
        <div className="lg:col-span-6 bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Campaign Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Select product and target parameters to generate tailored promotional copy
            </p>
          </div>

          {/* Product Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Select Dead Stock Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={loadingProducts}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {products.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} (SKU: {p.sku}) — ₹{p.sellingPrice} • Stock: {p.quantity ?? p.stockQuantity}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign Type & Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Campaign Type</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="flash_sale">⚡ 48-Hour Flash Sale</option>
                <option value="clearance">🏷️ Stock Clearance</option>
                <option value="bundle_offer">🎁 Companion Bundle</option>
                <option value="near_expiry">⏰ Fresh Stock Value</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all_customers">All Store Customers</option>
                <option value="repeat_customers">Repeat / VIP Buyers</option>
                <option value="local_customers">Local Neighborhood</option>
                <option value="custom">General Broadcast</option>
              </select>
            </div>
          </div>

          {/* Language & Tone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Language</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'english', label: 'English' },
                  { id: 'hindi', label: 'हिंदी' },
                  { id: 'hinglish', label: 'Hinglish' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguage(item.id)}
                    className={`py-1 rounded text-[11px] font-semibold transition-all ${
                      language === item.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="friendly">😊 Friendly & Warm</option>
                <option value="urgent">🔥 Urgent (Limited Units)</option>
                <option value="professional">💼 Professional & Direct</option>
              </select>
            </div>
          </div>

          {/* Discount & Profit Floor Safeguards */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Clearance Discount %</span>
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Max Safe: {maxSafeDiscount}% (Floor: ₹{minSafePrice})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={maxSafeDiscount || 100}
                placeholder={`Leave empty for AI safe recommendation (≤${maxSafeDiscount}%)`}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {maxSafeDiscount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountPercent(String(maxSafeDiscount))}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                >
                  Set Max Safe
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              Unit purchase cost: ₹{activeProduct?.purchaseCost || 0} • Selling list price: ₹{activeProduct?.sellingPrice || 0}.
            </p>
          </div>

          {/* Custom Store Note */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Store Add-On Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Free gift packaging on weekend orders"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Action */}
          <button
            type="button"
            disabled={generating || !selectedProductId}
            onClick={handleGenerateCampaign}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Composing Campaign...' : 'Generate Profit-Safe Broadcast Draft'}
          </button>
        </div>

        {/* Right Column (6 Cols): WhatsApp Bubble Preview & Interactive Actions */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-950">
                  Live WhatsApp Message Preview
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold uppercase">
                  {language}
                </span>
                {activeCampaign?.status && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 border border-emerald-200 capitalize font-medium">
                    {activeCampaign.status}
                  </span>
                )}
              </div>
            </div>

            {/* Editable WhatsApp Bubble */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Message Content (Click to Edit)
              </label>
              <textarea
                rows={11}
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                placeholder="Generated promotional copy will appear here. You can edit any line directly."
                className="w-full bg-white border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-800 font-mono leading-relaxed shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-pre-wrap"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="space-y-2.5 pt-2 border-t border-emerald-200/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!editableMessage || savingDraft}
                  onClick={() => handleSaveEdits()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  disabled={!editableMessage || savingDraft}
                  onClick={() => handleSaveEdits('ready')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Ready</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!editableMessage}
                  onClick={handleCopyMessage}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                </button>

                {editableMessage && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(editableMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1 shadow-2xs"
                    title="Open in WhatsApp Web"
                  >
                    <span>Open Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              * Phase 9 WhatsApp boundary: User-initiated copying and manual WhatsApp Web link. Messages are never sent automatically.
            </p>
          </div>
        </div>
      </div>

      {/* ── Campaign History & Archive Section ──────────────────────────────── */}
      <CampaignHistoryTable
        campaigns={campaigns}
        pagination={pagination}
        loading={historyLoading}
        filters={historyFilters}
        onFilterChange={(key, val) => {
          setHistoryFilters((prev) => ({ ...prev, [key]: val }));
          loadHistory(1);
        }}
        onPageChange={(p) => loadHistory(p)}
        onViewCampaign={(camp) => {
          setActiveCampaign(camp);
          setEditableMessage(camp.message);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onArchiveCampaign={(id) => handleArchive(id)}
      />

      {/* Quick Campaign Modal */}
      {modalOpen && (
        <CampaignGeneratorModal
          products={products}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onCampaignCreated={(camp) => {
            setActiveCampaign(camp);
            setEditableMessage(camp.message);
            loadHistory(1);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
