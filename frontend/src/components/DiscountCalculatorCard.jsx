/**
 * StockSaathi AI — Profit-Safe Discount Calculator Card (Phase 7)
 *
 * Compact, screenshot-faithful dashboard card for real-time margin protection
 * and dynamic discount optimization.
 */

import React, { useState, useEffect } from 'react';
import {
  Percent,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { calculateProposedDiscount, fetchDiscountRecommendation } from '../services/discountApi.js';
import { fetchProducts } from '../services/inventoryApi.js';

export default function DiscountCalculatorCard({
  preselectedProduct = null,
  onOpenFullCalculator = null,
}) {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProduct?._id || '');

  // Cost & price inputs
  const [purchaseCost, setPurchaseCost] = useState(preselectedProduct?.purchaseCost || 1200);
  const [sellingPrice, setSellingPrice] = useState(preselectedProduct?.sellingPrice || 2499);
  const [variableCost, setVariableCost] = useState(0);

  // Constraint
  const [constraintType, setConstraintType] = useState('minimum_margin');
  const [targetMarginPercent, setTargetMarginPercent] = useState(18);
  const [targetProfitUnit, setTargetProfitUnit] = useState(250);

  // Proposed discount
  const [discountPercent, setDiscountPercent] = useState(25);

  // Results & States
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  // Fetch initial products for selector
  useEffect(() => {
    let isMounted = true;
    fetchProducts({ limit: 50 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        setProducts(list);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Update when preselectedProduct changes
  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct._id || '');
      setPurchaseCost(preselectedProduct.purchaseCost || 0);
      setSellingPrice(preselectedProduct.sellingPrice || 0);
      if (preselectedProduct.minimumGrossMarginPercent) {
        setConstraintType('minimum_margin');
        setTargetMarginPercent(preselectedProduct.minimumGrossMarginPercent);
      }
    }
  }, [preselectedProduct]);

  // Handle product selection from dropdown
  const handleSelectProduct = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    setRecommendation(null);
    if (!id) return;
    const p = products.find((item) => item._id === id);
    if (p) {
      setPurchaseCost(p.purchaseCost || 0);
      setSellingPrice(p.sellingPrice || 0);
      if (p.minimumGrossMarginPercent) {
        setConstraintType('minimum_margin');
        setTargetMarginPercent(p.minimumGrossMarginPercent);
      } else if (p.minimumDesiredProfitPerUnit) {
        setConstraintType('minimum_profit');
        setTargetProfitUnit(p.minimumDesiredProfitPerUnit);
      }
    }
  };

  // Run calculation
  const runCalculation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        purchaseCost: Number(purchaseCost) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        variableCostPerUnit: Number(variableCost) || 0,
        discountPercent: Number(discountPercent) || 0,
        constraintType,
        minimumGrossMarginPercent: constraintType === 'minimum_margin' ? Number(targetMarginPercent) || 0 : undefined,
        minimumDesiredProfitPerUnit: constraintType === 'minimum_profit' ? Number(targetProfitUnit) || 0 : undefined,
        productId: selectedProductId || undefined,
      };

      const res = await calculateProposedDiscount(payload);
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.message || 'Calculation failed. Check cost inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sellingPrice > 0 && purchaseCost >= 0) {
        runCalculation();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [purchaseCost, sellingPrice, variableCost, constraintType, targetMarginPercent, targetProfitUnit, discountPercent, selectedProductId]);

  // Request smart recommendation
  const handleGetRecommendation = async () => {
    if (!selectedProductId) {
      setError('Please select a product from your inventory to generate a smart recommendation.');
      return;
    }
    setRecommending(true);
    setError(null);
    try {
      const payload = {
        productId: selectedProductId,
        variableCostPerUnit: Number(variableCost) || 0,
        constraintType,
        minimumGrossMarginPercent: constraintType === 'minimum_margin' ? Number(targetMarginPercent) : undefined,
        minimumDesiredProfitPerUnit: constraintType === 'minimum_profit' ? Number(targetProfitUnit) : undefined,
      };
      const res = await fetchDiscountRecommendation(payload);
      if (res.success) {
        const rec = res.data.recommendation;
        setRecommendation(rec);
        setDiscountPercent(rec.recommendedDiscountPercent);
      }
    } catch (err) {
      setError(err.message || 'Recommendation failed');
    } finally {
      setRecommending(false);
    }
  };

  const applyMaxSafeDiscount = () => {
    if (result && result.maximumSafeDiscountPercent !== undefined) {
      setDiscountPercent(result.maximumSafeDiscountPercent);
    }
  };

  const handleReset = () => {
    setSelectedProductId('');
    setPurchaseCost(1200);
    setSellingPrice(2499);
    setVariableCost(0);
    setDiscountPercent(25);
    setTargetMarginPercent(18);
    setRecommendation(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Profit-Safe Discount Optimizer
            </h3>
            <p className="text-[11px] text-slate-500">
              Prevent cash-bleeding offers with mathematical margin floors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenFullCalculator && (
            <button
              type="button"
              onClick={onOpenFullCalculator}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Full View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            title="Reset Inputs"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Product Select (Optional) */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Select Inventory Item (Optional)
        </label>
        <select
          value={selectedProductId}
          onChange={handleSelectProduct}
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">-- Manual Calculator Mode --</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} ({p.sku}) — ₹{p.sellingPrice} [Stock: {p.quantity}]
            </option>
          ))}
        </select>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
            Purchase Cost (₹)
          </label>
          <input
            type="number"
            min="0"
            value={purchaseCost}
            onChange={(e) => setPurchaseCost(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
            Selling Price (₹)
          </label>
          <input
            type="number"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
            Margin Floor (% Target)
          </label>
          <input
            type="number"
            min="0"
            max="99"
            value={targetMarginPercent}
            onChange={(e) => {
              setConstraintType('minimum_margin');
              setTargetMarginPercent(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[11px] font-medium text-slate-600">
              Proposed Discount (%)
            </label>
            <span className="text-[11px] font-bold text-blue-600">
              {discountPercent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            step="1"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {/* AI Recommendation Trigger */}
      {selectedProductId && (
        <button
          type="button"
          onClick={handleGetRecommendation}
          disabled={recommending}
          className="w-full py-1.5 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>{recommending ? 'Analyzing...' : 'Get AI Dead Stock Clearance Recommendation'}</span>
        </button>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calculated Results Banner */}
      {result && (
        <div
          className={`rounded-xl p-3.5 border transition-all ${
            result.isSafe
              ? 'bg-emerald-50/60 border-emerald-200/90'
              : 'bg-rose-50/70 border-rose-200/90'
          }`}
        >
          {/* Status Badge & Offer Price */}
          <div className="flex items-center justify-between border-b pb-2.5 mb-2.5 border-slate-200/60">
            <div className="flex items-center gap-1.5">
              {result.isSafe ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Profit-Safe Offer
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Unsafe Discount Floor
                </span>
              )}
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium">New Selling Price</div>
              <div className="text-base font-extrabold text-slate-900">
                ₹{result.proposedSellingPrice?.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/80 rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">Gross Profit</div>
              <div className={`font-bold ${result.proposedGrossProfitPerUnit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                ₹{result.proposedGrossProfitPerUnit}
              </div>
            </div>

            <div className="bg-white/80 rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">Gross Margin</div>
              <div className={`font-bold ${result.proposedGrossMarginPercent >= targetMarginPercent ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.proposedGrossMarginPercent}%
              </div>
            </div>

            <div className="bg-white/80 rounded-lg p-1.5 border border-slate-200/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">Min Safe Price</div>
              <div className="font-bold text-slate-900">
                ₹{result.minimumAcceptablePrice}
              </div>
            </div>
          </div>

          {/* Shortfall or Success Note */}
          {!result.isSafe && (
            <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-800">
              <span>Shortfall: ₹{result.shortfallPerUnit}/unit</span>
              <button
                type="button"
                onClick={applyMaxSafeDiscount}
                className="font-bold text-rose-900 underline hover:no-underline cursor-pointer"
              >
                Set to Max Safe ({result.maximumSafeDiscountPercent}%)
              </button>
            </div>
          )}

          {/* Recommendation Note if Available */}
          {recommendation && (
            <div className="mt-2.5 p-2 bg-purple-50/70 border border-purple-200/70 rounded-lg text-[11px] text-purple-900 space-y-0.5">
              <div className="font-bold flex items-center gap-1 text-purple-800">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>AI Recommendation Reason:</span>
              </div>
              <p className="leading-snug">{recommendation.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
