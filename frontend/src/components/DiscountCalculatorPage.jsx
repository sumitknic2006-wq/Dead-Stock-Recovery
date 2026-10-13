/**
 * StockSaathi AI — Profit-Safe Discount Optimization Page (Phase 7)
 *
 * Full-screen dedicated workspace for testing promotional markdowns, protecting margins,
 * and liquidating stagnant inventory without incurring operational losses.
 */

import React, { useState, useEffect } from 'react';
import {
  Percent,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Layers,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { calculateProposedDiscount, fetchDiscountRecommendation } from '../services/discountApi.js';
import { fetchProducts } from '../services/inventoryApi.js';

export default function DiscountCalculatorPage({ preselectedProductId = null }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form parameters
  const [purchaseCost, setPurchaseCost] = useState(1200);
  const [sellingPrice, setSellingPrice] = useState(2499);
  const [variableCost, setVariableCost] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [constraintType, setConstraintType] = useState('minimum_margin');
  const [targetMarginPercent, setTargetMarginPercent] = useState(18);
  const [targetProfitUnit, setTargetProfitUnit] = useState(250);
  const [discountPercent, setDiscountPercent] = useState(20);

  // Results
  const [result, setResult] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState(null);

  // Load products
  useEffect(() => {
    let isMounted = true;
    setLoadingProducts(true);
    fetchProducts({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        setProducts(list);
        if (preselectedProductId) {
          const match = list.find((p) => p._id === preselectedProductId);
          if (match) loadProduct(match);
        } else if (list.length > 0) {
          loadProduct(list[0]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError('Failed to load products: ' + err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [preselectedProductId]);

  const loadProduct = (p) => {
    setSelectedProduct(p);
    setPurchaseCost(p.purchaseCost || 0);
    setSellingPrice(p.sellingPrice || 0);
    setQuantity(p.quantity > 0 ? p.quantity : 1);
    if (p.minimumGrossMarginPercent) {
      setConstraintType('minimum_margin');
      setTargetMarginPercent(p.minimumGrossMarginPercent);
    } else if (p.minimumDesiredProfitPerUnit) {
      setConstraintType('minimum_profit');
      setTargetProfitUnit(p.minimumDesiredProfitPerUnit);
    }
    setRecommendation(null);
    runSmartRecommendation(p._id);
  };

  const runSmartRecommendation = async (productId) => {
    if (!productId) return;
    setRecommending(true);
    try {
      const res = await fetchDiscountRecommendation({
        productId,
        constraintType,
        minimumGrossMarginPercent: Number(targetMarginPercent),
      });
      if (res.success) {
        setRecommendation(res.data.recommendation);
        setDiscountPercent(res.data.recommendation.recommendedDiscountPercent);
      }
    } catch {
      // ignore
    } finally {
      setRecommending(false);
    }
  };

  // Run calculation
  const runCalc = async (dVal = discountPercent) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        productId: selectedProduct?._id || undefined,
        purchaseCost: Number(purchaseCost) || 0,
        sellingPrice: Number(sellingPrice) || 0,
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

  // Auto-calculate
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sellingPrice > 0 && purchaseCost >= 0) {
        runCalc();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [purchaseCost, sellingPrice, variableCost, quantity, constraintType, targetMarginPercent, targetProfitUnit, discountPercent, selectedProduct]);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Phase 7 Financial Safeguards Active</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Profit-Safe Dynamic Discount Optimizer
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Protect your bottom line while liquidating dead inventory. Our deterministic engine calculates
            absolute minimum acceptable price floors so your clearance promotions never cause a financial loss.
          </p>
        </div>
      </div>

      {/* Main 2-Column Optimizer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Controls & Sliders */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Discount Proposal Parameters</span>
            </h3>
            {selectedProduct && (
              <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                {selectedProduct.sku}
              </span>
            )}
          </div>

          {/* Product Info Badge */}
          {selectedProduct ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{selectedProduct.name}</div>
                <div className="text-[11px] text-slate-500">
                  Stock: {selectedProduct.quantity} units • Category: {selectedProduct.category}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-800">
              Manual mode active. Select an item from the table below to analyze specific inventory.
            </div>
          )}

          {/* Price & Cost Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listed Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Margin Constraint Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Profit Floor Constraint
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setConstraintType('minimum_margin')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    constraintType === 'minimum_margin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Min Margin %
                </button>
                <button
                  type="button"
                  onClick={() => setConstraintType('minimum_profit')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    constraintType === 'minimum_profit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Min Profit ₹
                </button>
              </div>
            </div>

            {constraintType === 'minimum_margin' ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={targetMarginPercent}
                  onChange={(e) => setTargetMarginPercent(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                />
                <span className="text-xs text-slate-500 font-medium">% Minimum Gross Margin</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={targetProfitUnit}
                  onChange={(e) => setTargetProfitUnit(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                />
                <span className="text-xs text-slate-500 font-medium">₹ Minimum Profit Per Unit</span>
              </div>
            )}
          </div>

          {/* Discount Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Simulated Markdown
              </label>
              <span className="text-base font-extrabold text-blue-600">
                {discountPercent}% OFF
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="1"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>0% (Full Price)</span>
              <span>Max Safe: {result?.maximumSafeDiscountPercent ?? '--'}%</span>
              <span>70% Markdown</span>
            </div>
          </div>

          {/* Quantity */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Clearance Batch Quantity:
            </label>
            <input
              type="number"
              min="1"
              max={selectedProduct?.quantity || 9999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 text-right"
            />
          </div>
        </div>

        {/* Right: Live Outcomes & Explainable Intelligence */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Results Card */}
          {result && (
            <div
              className={`rounded-xl p-5 border shadow-2xs transition-all ${
                result.isSafe
                  ? 'bg-white border-emerald-300'
                  : 'bg-white border-rose-300'
              }`}
            >
              {/* Header Badge & Price Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  {result.isSafe ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Profit-Safe Offer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Floor Breached: Shortfall ₹{result.shortfallPerUnit}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="text-xs text-slate-400 line-through">
                    ₹{result.originalSellingPrice}
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ₹{result.proposedSellingPrice}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Save ₹{result.discountAmountPerUnit} ({result.discountPercent}%)
                  </div>
                </div>
              </div>

              {/* 4 Financial Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-medium">Gross Profit / Unit</div>
                  <div className={`text-base font-bold mt-0.5 ${result.proposedGrossProfitPerUnit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    ₹{result.proposedGrossProfitPerUnit}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-medium">Proposed Margin</div>
                  <div className={`text-base font-bold mt-0.5 ${result.isSafe ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.proposedGrossMarginPercent}%
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-medium">Minimum Safe Price</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    ₹{result.minimumAcceptablePrice}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-medium">Total Cash Unlocked</div>
                  <div className="text-base font-bold text-blue-600 mt-0.5">
                    ₹{result.expectedGrossSalesValue?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Explanation & Action Row */}
              <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2">
                <div className="font-semibold text-slate-800">
                  Financial Impact Explanation:
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {result.explanation}
                </p>

                {!result.isSafe && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-rose-800">
                    <span className="font-medium">
                      Maximum safe discount at current list price is {result.maximumSafeDiscountPercent}%.
                    </span>
                    <button
                      type="button"
                      onClick={() => setDiscountPercent(result.maximumSafeDiscountPercent)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                    >
                      Apply Max Safe ({result.maximumSafeDiscountPercent}%)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Recommendation Details Card */}
          {recommendation && (
            <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Explainable Clearance Recommendation
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Formulated using Phase 6 dead stock risk score & velocity analysis
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscountPercent(recommendation.recommendedDiscountPercent)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Set to {recommendation.recommendedDiscountPercent}% Markdown
                </button>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                {recommendation.explanation}
              </div>

              {recommendation.dataLimitations && (
                <div className="text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-500">Assumptions & Constraints:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {recommendation.dataLimitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Products Table for One-Click Optimization */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Live Product Catalog & Discount Triggers
            </h3>
            <p className="text-xs text-slate-500">
              Click any inventory item below to simulate profit-safe clearance pricing
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (₹)</th>
                <th className="py-3 px-4 text-right">List Price (₹)</th>
                <th className="py-3 px-4 text-right">Margin Floor</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.map((p) => {
                const isSelected = selectedProduct?._id === p._id;
                return (
                  <tr
                    key={p._id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4">{p.category}</td>
                    <td className="py-3 px-4 text-right font-medium">₹{p.purchaseCost}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">₹{p.sellingPrice}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {p.minimumGrossMarginPercent ? `${p.minimumGrossMarginPercent}%` : '15% (Default)'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{p.quantity}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => loadProduct(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Loaded' : 'Optimize'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
