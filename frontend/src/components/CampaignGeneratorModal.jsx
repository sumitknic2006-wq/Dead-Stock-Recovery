/**
 * StockSaathi AI — Campaign Generator Modal (Phase 9)
 *
 * Interactive popup modal for composing profit-safe WhatsApp promotional broadcasts
 * for any inventory item across English, Hindi, and Hinglish.
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  RotateCcw,
  Package,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { generateCampaign } from '../services/campaignApi.js';
import { calculateMinimumSafePrice } from '../services/discountApi.js';

export default function CampaignGeneratorModal({
  product = null,
  products = [],
  isOpen,
  onClose,
  onCampaignCreated,
}) {
  const [selectedProductId, setSelectedProductId] = useState(
    product?._id || product?.id || ''
  );
  const [campaignType, setCampaignType] = useState('flash_sale');
  const [targetAudience, setTargetAudience] = useState('all_customers');
  const [language, setLanguage] = useState('english');
  const [tone, setTone] = useState('friendly');
  const [discountPercent, setDiscountPercent] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [campaignName, setCampaignName] = useState('');

  // Price safety state
  const [priceFloorInfo, setPriceFloorInfo] = useState(null);
  const [loadingFloor, setLoadingFloor] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Sync selected product
  useEffect(() => {
    if (product) {
      setSelectedProductId(product._id || product.id || '');
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0]._id || products[0].id || '');
    }
  }, [product, products, selectedProductId]);

  const activeProduct =
    (product && (product._id === selectedProductId || product.id === selectedProductId))
      ? product
      : products.find((p) => (p._id || p.id) === selectedProductId) || null;

  // Compute live price floor
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

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product');
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
        setResult(res);
        onCampaignCreated?.(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = result?.data?.message;
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maxSafeDiscount = priceFloorInfo?.maximumSafeDiscountPercent ?? 0;
  const minSafePrice = priceFloorInfo?.minimumAcceptablePrice ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 fill-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Generate WhatsApp Clearance Campaign
              </h2>
              <p className="text-xs text-slate-500">
                Create a customized, profit-safe broadcast message for Indian retail shoppers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Product Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Product</label>
              {products.length > 0 ? (
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} (SKU: {p.sku}) — ₹{p.sellingPrice} • Stock: {p.quantity ?? p.stockQuantity}
                    </option>
                  ))}
                </select>
              ) : activeProduct ? (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 font-semibold">
                  {activeProduct.name} • ₹{activeProduct.sellingPrice}
                </div>
              ) : (
                <div className="text-xs text-slate-400">No products available</div>
              )}
            </div>

            {/* Campaign Type & Target Audience */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="flash_sale">Flash Sale</option>
                  <option value="clearance">Stock Clearance</option>
                  <option value="bundle_offer">Bundle Offer</option>
                  <option value="near_expiry">Near Expiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all_customers">All Customers</option>
                  <option value="repeat_customers">Repeat / VIP Buyers</option>
                  <option value="local_customers">Local Neighbors</option>
                  <option value="custom">General Broadcast</option>
                </select>
              </div>
            </div>

            {/* Language & Tone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Language</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                  {['english', 'hindi', 'hinglish'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                        language === lang
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {lang === 'hindi' ? 'हिंदी' : lang}
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
                  <option value="friendly">Friendly & Warm</option>
                  <option value="urgent">Urgent (Limited Stock)</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>

            {/* Discount Input & Profit Floor Safeguards */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Discount % (Optional)</span>
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Max Safe: {maxSafeDiscount}% (Floor: ₹{minSafePrice})
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={maxSafeDiscount || 100}
                placeholder={`Leave blank for AI recommended discount (${maxSafeDiscount > 0 ? `≤${maxSafeDiscount}%` : '0%'})`}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400">
                Discounts exceeding {maxSafeDiscount}% will be rejected to protect your unit gross margin.
              </p>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Custom Store Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Free gift bag on purchases above ₹500"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              disabled={generating || !selectedProductId}
              onClick={handleGenerate}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Composing Campaign...' : 'Generate Profit-Safe Campaign'}
            </button>
          </div>

          {/* Right Column: Live Message Preview */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-emerald-50/40 rounded-2xl border border-emerald-200/80 p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 border-b border-emerald-200/60 pb-1.5">
                <span>WhatsApp Message Draft</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200/80 text-emerald-950 font-mono">
                  {language.toUpperCase()}
                </span>
              </div>

              {result ? (
                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed shadow-2xs max-h-[340px] overflow-y-auto">
                  {result.data?.message}
                </div>
              ) : (
                <div className="bg-white/80 border border-dashed border-emerald-200 rounded-xl p-8 text-center text-xs text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-emerald-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No Draft Generated Yet</p>
                  <p className="text-[11px]">Configure parameters on the left and click "Generate Profit-Safe Campaign".</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">
                * User-initiated copying only. Messages are not sent automatically.
              </span>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(result.data?.message || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>Share</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
