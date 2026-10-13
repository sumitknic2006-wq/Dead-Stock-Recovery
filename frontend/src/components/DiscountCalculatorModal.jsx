/**
 * StockSaathi AI — Discount Optimizer Modal (Phase 7)
 *
 * Deep-dive profit protection modal enabling small retailers to simulate markdowns,
 * test margin floors, and view explainable AI clearance recommendations.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Percent,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { calculateProposedDiscount, fetchDiscountRecommendation } from '../services/discountApi.js';

export default function DiscountCalculatorModal({ product, onClose }) {
  if (!product) return null;

  const [purchaseCost, setPurchaseCost] = useState(product.purchaseCost || 0);
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice || 0);
  const [variableCost, setVariableCost] = useState(0);
  const [quantity, setQuantity] = useState(product.quantity || 1);

  // Constraint
  const [constraintType, setConstraintType] = useState('minimum_margin');
  const [targetMarginPercent, setTargetMarginPercent] = useState(
    product.minimumGrossMarginPercent || 15
  );
  const [targetProfitUnit, setTargetProfitUnit] = useState(
    product.minimumDesiredProfitPerUnit || 100
  );

  // Proposed discount
  const [discountPercent, setDiscountPercent] = useState(20);

  // States
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  // Run calculation
  const runCalc = async (dVal = discountPercent) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        productId: product._id,
        purchaseCost: Number(purchaseCost),
        sellingPrice: Number(sellingPrice),
        variableCostPerUnit: Number(variableCost) || 0,
        quantity: Number(quantity) || 1,
        discountPercent: Number(dVal) || 0,
        constraintType,
        minimumGrossMarginPercent: constraintType === 'minimum_margin' ? Number(targetMarginPercent) : undefined,
        minimumDesiredProfitPerUnit: constraintType === 'minimum_profit' ? Number(targetProfitUnit) : undefined,
      };
      const res = await calculateProposedDiscount(payload);
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.message || 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial recommendation on mount
  useEffect(() => {
    let isMounted = true;
    setRecommending(true);
    fetchDiscountRecommendation({
      productId: product._id,
      constraintType,
      minimumGrossMarginPercent: Number(targetMarginPercent),
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          const rec = res.data.recommendation;
          setRecommendation(rec);
          setDiscountPercent(rec.recommendedDiscountPercent);
          runCalc(rec.recommendedDiscountPercent);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        runCalc(20);
      })
      .finally(() => {
        if (isMounted) setRecommending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product._id]);

  // Recalculate when discount or target changes
  const handleDiscountChange = (val) => {
    setDiscountPercent(val);
    runCalc(val);
  };

  const applyMaxSafe = () => {
    if (result && result.maximumSafeDiscountPercent !== undefined) {
      handleDiscountChange(result.maximumSafeDiscountPercent);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Profit-Safe Discount Optimizer
              </h3>
              <p className="text-xs text-slate-500">
                Simulate markdowns with automated profit-floor protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Product Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {product.category || 'Inventory Item'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">
                {product.name}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                SKU: {product.sku} • Stock: {product.quantity} units
              </p>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">List Price</div>
                <div className="text-sm font-bold text-slate-900">₹{product.sellingPrice}</div>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Cost Price</div>
                <div className="text-sm font-bold text-slate-900">₹{product.purchaseCost}</div>
              </div>
            </div>
          </div>

          {/* AI Recommendation Box if available */}
          {recommendation && (
            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
              <div className="flex items-center justify-between font-bold text-purple-900">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>AI Recommendation: {recommendation.recommendedDiscountPercent}% Markdown</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDiscountChange(recommendation.recommendedDiscountPercent)}
                  className="text-[11px] bg-purple-600 text-white px-2.5 py-1 rounded-md hover:bg-purple-700 cursor-pointer transition-colors"
                >
                  Apply Recommendation
                </button>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed pt-0.5">
                {recommendation.explanation}
              </p>
            </div>
          )}

          {/* Controls: Target Floor & Discount Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Margin Floor Protection
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={targetMarginPercent}
                  onChange={(e) => {
                    setTargetMarginPercent(e.target.value);
                    setTimeout(() => runCalc(), 100);
                  }}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                />
                <span className="text-xs text-slate-500 font-medium">% Min Gross Margin</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Discounts exceeding this floor will be flagged as cash-bleeding.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Proposed Discount
                </label>
                <span className="text-sm font-extrabold text-blue-600">
                  {discountPercent}% OFF
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                step="1"
                value={discountPercent}
                onChange={(e) => handleDiscountChange(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0% (Full Price)</span>
                <span>Max Safe: {result?.maximumSafeDiscountPercent ?? '--'}%</span>
                <span>65%</span>
              </div>
            </div>
          </div>

          {/* Financial Calculation Results Card */}
          {result && (
            <div
              className={`rounded-xl p-4 border transition-all ${
                result.isSafe
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                <div className="flex items-center gap-2">
                  {result.isSafe ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Profit Safe: Target Margin Preserved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Floor Breached: Shortfall ₹{result.shortfallPerUnit}/unit
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium">New Retail Price</span>
                  <div className="text-lg font-black text-slate-900">
                    ₹{result.proposedSellingPrice}
                  </div>
                </div>
              </div>

              {/* Financial Metrics 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-medium">Unit Profit</div>
                  <div className={`font-bold text-sm ${result.proposedGrossProfitPerUnit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    ₹{result.proposedGrossProfitPerUnit}
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-medium">Gross Margin</div>
                  <div className={`font-bold text-sm ${result.proposedGrossMarginPercent >= targetMarginPercent ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.proposedGrossMarginPercent}%
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-medium">Safe Price Floor</div>
                  <div className="font-bold text-sm text-slate-900">
                    ₹{result.minimumAcceptablePrice}
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-medium">Total Cash Unlock</div>
                  <div className="font-bold text-sm text-blue-600">
                    ₹{result.expectedGrossSalesValue?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {!result.isSafe && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/60 flex items-center justify-between text-xs text-rose-800">
                  <span>
                    Warning: Selling at ₹{result.proposedSellingPrice} falls below your minimum price of ₹{result.minimumAcceptablePrice}.
                  </span>
                  <button
                    type="button"
                    onClick={applyMaxSafe}
                    className="font-bold underline text-rose-900 hover:no-underline cursor-pointer flex-shrink-0 ml-2"
                  >
                    Auto-Set to {result.maximumSafeDiscountPercent}%
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            * All calculations run deterministically on real inventory cost records.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
