/**
 * StockSaathi AI — DeadStockAnalysisPage (Phase 6)
 *
 * Full-page interactive analysis view for Dead Stock detection, risk scoring,
 * component score breakdown, explainable recommendations, and data completeness auditing.
 * Connected exclusively to real backend API: GET /api/analysis/dead-stock
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Info,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  IndianRupee,
  Layers,
  Sparkles,
  Percent,
} from 'lucide-react';
import { fetchDeadStockAnalysis, fetchDeadStockSummary } from '../services/analysisApi.js';
import DiscountCalculatorModal from './DiscountCalculatorModal.jsx';

export default function DeadStockAnalysisPage({ onNavigate }) {
  // State
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [optimizingProduct, setOptimizingProduct] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sortBy, setSortBy] = useState('daysSinceLastSale');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Selected item drawer / detail modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Load summary metrics
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetchDeadStockSummary();
      setSummary(res.data.summary);
    } catch {
      // Summary error handled gracefully
    }
  }, []);

  // Load products list
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDeadStockAnalysis({
        search,
        category,
        classification: classificationFilter,
        severity: severityFilter,
        sortBy,
        order: sortOrder,
        page,
        limit: 15,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load dead stock analysis. Please check your backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, [search, category, classificationFilter, severityFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Priority badge styling
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 mb-1">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            Deterministic Analysis Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dead Stock Detection & Risk Scoring
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time aging analysis, component-based risk scores, and margin-preserving next steps.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadSummary();
            loadProducts();
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Critical Dead Stock (&gt;90d)</span>
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.deadStockTotalCostValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-red-600 font-medium">
              {summary.classifications.critical_dead_stock.count} SKUs · {summary.deadStockTotalUnits} units held
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>At Risk Stock (60–90d)</span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.atRiskTotalCostValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-orange-600 font-medium">
              {summary.classifications.at_risk.count} SKUs approaching threshold
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Slow Moving (30–59d)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.classifications.slow_moving.costValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 font-medium">
              {summary.classifications.slow_moving.count} SKUs · Velocity slowing
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Insufficient Sales Data</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900">
              {summary.classifications.insufficient_data.count} SKUs
            </div>
            <div className="text-[11px] text-slate-500">
              ₹{summary.classifications.insufficient_data.costValue.toLocaleString('en-IN')} exposure (audit needed)
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Toolbar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Classification Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: '', label: 'All Items' },
              { key: 'critical_dead_stock', label: 'Dead Stock (>90d)' },
              { key: 'at_risk', label: 'At Risk (60–90d)' },
              { key: 'slow_moving', label: 'Slow Moving' },
              { key: 'healthy', label: 'Healthy' },
              { key: 'insufficient_data', label: 'No Sales Data' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setClassificationFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  classificationFilter === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="daysSinceLastSale">Days Idle</option>
              <option value="riskScore">Risk Score</option>
              <option value="inventoryCostValue">Stock Value</option>
              <option value="quantity">Quantity</option>
              <option value="name">Product Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 rounded-md text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadProducts}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Data Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 sm:px-6">Product & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-center">Days Stagnant</th>
                <th className="py-3 px-4 text-right">Holding Cost</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4">Next Recommended Step</th>
                <th className="py-3 px-4 text-right sm:px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                // Skeleton loading rows
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-44" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-8 mx-auto" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-12 mx-auto" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                    <td className="py-4 px-4"><div className="h-5 bg-slate-100 rounded w-16 mx-auto" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan="8" className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      No matching inventory items found
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {search || classificationFilter || severityFilter
                        ? 'Try clearing your active search or filters.'
                        : 'Your inventory catalog is healthy with no dead stock detected.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((prod) => {
                  const isDead = prod.classification.key === 'critical_dead_stock';
                  const isAtRisk = prod.classification.key === 'at_risk';
                  const isNoData = prod.classification.key === 'insufficient_data';

                  return (
                    <tr
                      key={prod.productId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedProduct(prod)}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {prod.sku} · {prod.condition}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {prod.category}
                      </td>

                      {/* Qty */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {prod.quantity}
                      </td>

                      {/* Days Stagnant */}
                      <td className="py-3.5 px-4 text-center font-semibold">
                        {isNoData ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            No record
                          </span>
                        ) : (
                          <span
                            className={
                              isDead
                                ? 'text-red-600 font-bold'
                                : isAtRisk
                                ? 'text-orange-600 font-bold'
                                : 'text-slate-700'
                            }
                          >
                            {prod.daysSinceLastSale}d
                          </span>
                        )}
                      </td>

                      {/* Stock Value */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        ₹{prod.inventoryCostValue.toLocaleString('en-IN')}
                      </td>

                      {/* Risk Score & Severity */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(
                              prod.severity
                            )}`}
                          >
                            {prod.riskScore}/100 · {prod.severity}
                          </span>
                        </div>
                        {prod.isProvisional && (
                          <div className="text-[9px] text-amber-600 font-medium mt-0.5">
                            Provisional
                          </div>
                        )}
                      </td>

                      {/* Recommendation */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        {prod.recommendations?.[0] ? (
                          <div>
                            <div className="font-semibold text-slate-800 truncate">
                              {prod.recommendations[0].title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {prod.recommendations[0].description}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Regular monitoring</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(prod);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Explain</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar ───────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{items.length}</strong> of{' '}
            <strong className="text-slate-800">{pagination.total}</strong> products
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Explainability Drawer / Details Modal ────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedProduct.classification.badgeClass}`}
                  >
                    {selectedProduct.classification.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityBadge(
                      selectedProduct.severity
                    )}`}
                  >
                    Risk Score: {selectedProduct.riskScore}/100 ({selectedProduct.severity})
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedProduct.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  SKU: {selectedProduct.sku} · Category: {selectedProduct.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-center">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Held Capital</div>
                <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                  ₹{selectedProduct.inventoryCostValue.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500">{selectedProduct.quantity} units @ ₹{selectedProduct.purchaseCost}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Listed Sales Value</div>
                <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                  ₹{selectedProduct.potentialSalesValue.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500">₹{selectedProduct.sellingPrice} per unit</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Unrealized Gross Margin</div>
                <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                  {selectedProduct.grossMarginPercent}%
                </div>
                <div className="text-[10px] text-emerald-700">₹{selectedProduct.estimatedGrossProfit.toLocaleString('en-IN')} est. profit</div>
              </div>
            </div>

            {/* Component Score Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Score Contribution Breakdown (0–100)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-slate-400 text-[10px]">Stock Age</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedProduct.componentScores.age} <span className="text-[10px] text-slate-400 font-normal">/ 55 pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedProduct.daysSinceLastSale !== null ? `${selectedProduct.daysSinceLastSale}d idle` : 'No sale date'}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-slate-400 text-[10px]">Capital Held</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedProduct.componentScores.capital} <span className="text-[10px] text-slate-400 font-normal">/ 25 pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ₹{selectedProduct.inventoryCostValue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-slate-400 text-[10px]">Physical Volume</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedProduct.componentScores.quantity} <span className="text-[10px] text-slate-400 font-normal">/ 10 pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedProduct.quantity} units
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-slate-400 text-[10px]">Expiry Proximity</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedProduct.componentScores.expiry} <span className="text-[10px] text-slate-400 font-normal">/ 10 pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedProduct.expiryDate ? 'Tracked' : 'No expiry'}
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Codes & Explanations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Evidence &amp; Analysis Factors
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {selectedProduct.explanations.map((exp, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Next Actions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Actionable Recommendations
              </h4>
              <div className="space-y-2">
                {selectedProduct.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950">{rec.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-slate-700">{rec.description}</p>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      Rationale: {rec.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Completeness */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Data completeness score: <strong>{selectedProduct.dataCompleteness.completenessScore}%</strong></span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prodToOptimize = {
                      _id: selectedProduct.productId,
                      name: selectedProduct.name,
                      sku: selectedProduct.sku,
                      category: selectedProduct.category,
                      purchaseCost: selectedProduct.purchaseCost,
                      sellingPrice: selectedProduct.sellingPrice,
                      quantity: selectedProduct.quantity,
                      minimumGrossMarginPercent: selectedProduct.minimumGrossMarginPercent,
                      minimumDesiredProfitPerUnit: selectedProduct.minimumDesiredProfitPerUnit,
                    };
                    setOptimizingProduct(prodToOptimize);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Optimize Discount</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Optimizer Modal */}
      {optimizingProduct && (
        <DiscountCalculatorModal
          product={optimizingProduct}
          onClose={() => setOptimizingProduct(null)}
        />
      )}
    </div>
  );
}
