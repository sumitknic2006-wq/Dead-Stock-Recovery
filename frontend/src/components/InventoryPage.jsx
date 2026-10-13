/**
 * StockSaathi AI — InventoryPage (Phase 5)
 *
 * Full-stack inventory management page.
 * All data comes from the real Express/MongoDB backend via inventoryApi.js.
 * No fake data, no localStorage, no hardcoded arrays.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Plus, Search, Filter, ArrowUpDown, Download, Upload,
  RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Edit2, Trash2,
  CheckCircle2, X, TrendingUp, IndianRupee, BarChart3, Archive,
  Loader2, Database
} from 'lucide-react';
import {
  fetchProducts,
  fetchInventorySummary,
  createProduct,
  updateProduct,
  deleteProduct,
  downloadCsvExport,
} from '../services/inventoryApi.js';
import ProductFormModal from './ProductFormModal.jsx';
import DeleteConfirmDialog from './DeleteConfirmDialog.jsx';
import CsvImportModal from './CsvImportModal.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 15;
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'purchaseCost', label: 'Purchase Cost' },
  { value: 'sellingPrice', label: 'Selling Price' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoryPage() {
  // ── State ───────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Operation states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  // Debounce search
  const searchDebounce = useRef(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProducts({
        search: opts.search ?? search,
        category: opts.category ?? categoryFilter,
        sortBy: opts.sortBy ?? sortBy,
        order: opts.order ?? sortOrder,
        page: opts.page ?? page,
        limit: ITEMS_PER_PAGE,
      });
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load products. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, sortBy, sortOrder, page]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await fetchInventorySummary();
      setSummary(result.data);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Initial load + reload on filter/page changes
  useEffect(() => {
    loadProducts();
  }, [sortBy, sortOrder, page, categoryFilter]);

  useEffect(() => {
    loadSummary();
  }, []);

  // Debounced search
  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      loadProducts({ search: val, page: 1 });
    }, 400);
  }

  // ── Toast helper ─────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditProduct(null);
    setSaveError(null);
    setFormOpen(true);
  }

  function openEdit(product) {
    setEditProduct(product);
    setSaveError(null);
    setFormOpen(true);
  }

  function openDelete(product) {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  }

  async function handleSave(payload) {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editProduct) {
        await updateProduct(editProduct._id, payload);
        showToast(`"${payload.name}" updated successfully`);
      } else {
        await createProduct(payload);
        showToast(`"${payload.name}" added to inventory`);
      }
      setFormOpen(false);
      setPage(1);
      await Promise.all([loadProducts({ page: 1 }), loadSummary()]);
    } catch (err) {
      setSaveError(err.message || 'Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    setIsDeleting(true);
    try {
      await deleteProduct(id);
      showToast(`"${productToDelete?.name}" deleted`, 'success');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      await Promise.all([loadProducts(), loadSummary()]);
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadCsvExport({ search, category: categoryFilter });
      showToast('CSV export downloaded');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  function handleSortChange(field) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setCategoryFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    loadProducts({ search: '', category: '', sortBy: 'createdAt', order: 'desc', page: 1 });
  }

  const hasActiveFilters = search || categoryFilter || sortBy !== 'createdAt';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your complete product catalog — add, edit, search, and export.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCsvImportOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button onClick={handleExport} disabled={isExporting} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <SummaryRow summary={summary} loading={summaryLoading} error={summaryError} onRetry={loadSummary} />

      {/* ── Filters Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product name or SKU…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {search && (
            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by category…"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => { setSortOrder((o) => o === 'asc' ? 'desc' : 'asc'); setPage(1); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50"
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortOrder === 'asc' ? 'ASC' : 'DESC'}
        </button>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50">
            <X className="w-3.5 h-3.5" /> Clear Filters
          </button>
        )}

        <button onClick={() => loadProducts()} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Product Table ───────────────────────────────────────────────── */}
      <ProductTable
        products={products}
        loading={loading}
        error={error}
        onRetry={() => loadProducts()}
        onEdit={openEdit}
        onDelete={openDelete}
        onSort={handleSortChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && !error && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ProductFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        product={editProduct}
        isSaving={isSaving}
        saveError={saveError}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setProductToDelete(null); }}
        onConfirm={handleDelete}
        product={productToDelete}
        isDeleting={isDeleting}
      />

      <CsvImportModal
        isOpen={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImportComplete={() => {
          setCsvImportOpen(false);
          loadProducts({ page: 1 });
          loadSummary();
        }}
      />
    </div>
  );
}

// ── Summary Cards Row ─────────────────────────────────────────────────────────

function SummaryRow({ summary, loading, error, onRetry }) {
  const cards = summary ? [
    {
      icon: Package, bg: 'bg-blue-50', text: 'text-blue-600',
      label: 'Total Products', value: summary.totalProducts.toLocaleString('en-IN'),
      sub: `${summary.totalUnitsInStock.toLocaleString('en-IN')} units in stock`,
    },
    {
      icon: IndianRupee, bg: 'bg-amber-50', text: 'text-amber-600',
      label: 'Inventory Cost Value', value: fmt(summary.totalInventoryCostValue),
      sub: 'purchaseCost × quantity',
    },
    {
      icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600',
      label: 'Potential Sales Value', value: fmt(summary.potentialSalesValue),
      sub: 'sellingPrice × quantity',
    },
    {
      icon: BarChart3, bg: 'bg-purple-50', text: 'text-purple-600',
      label: 'Est. Gross Profit', value: fmt(summary.estimatedGrossProfit),
      sub: 'At listed prices only',
    },
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-6 bg-slate-200 rounded w-32 mb-2" />
            <div className="h-2.5 bg-slate-100 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-xs text-amber-800">
        <Database className="w-4 h-4 flex-shrink-0" />
        <span>Could not load summary: {error}</span>
        <button onClick={onRetry} className="ml-auto text-amber-700 underline">Retry</button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.text}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Product Table ─────────────────────────────────────────────────────────────

function ProductTable({ products, loading, error, onRetry, onEdit, onDelete, onSort, sortBy, sortOrder }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading products…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-red-700 mb-1">Failed to load products</p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-500">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No products found</p>
        <p className="text-xs text-slate-400">Try adjusting your search/filter, or add your first product.</p>
      </div>
    );
  }

  function SortTh({ field, children, align = 'left' }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => onSort(field)}
        className={`py-3 px-4 text-${align} text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 transition-colors ${active ? 'text-blue-600' : 'text-slate-500'}`}
      >
        <span className="flex items-center gap-1 justify-start">
          {children}
          {active && <ArrowUpDown className="w-3 h-3 opacity-60" />}
        </span>
      </th>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <SortTh field="name">Product</SortTh>
              <th className="py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <SortTh field="purchaseCost">Cost ₹</SortTh>
              <SortTh field="sellingPrice">Price ₹</SortTh>
              <SortTh field="quantity">Qty</SortTh>
              <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inv. Value</th>
              <SortTh field="lastSaleDate">Last Sale</SortTh>
              <th className="py-3 px-4 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50/70 transition-colors group">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900 truncate max-w-[180px]">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">{p.category}</td>
                <td className="py-3.5 px-4 font-mono text-slate-700">{fmt(p.purchaseCost)}</td>
                <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{fmt(p.sellingPrice)}</td>
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                    p.quantity === 0 ? 'bg-red-100 text-red-700' :
                    p.quantity < 5 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.quantity}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                  {fmt(p.purchaseCost * p.quantity)}
                </td>
                <td className="py-3.5 px-4 text-slate-500">{fmtDate(p.lastSaleDate)}</td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                      title="Edit product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(p)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      title="Delete product"
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
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>Showing {start}–{end} of {total.toLocaleString('en-IN')} products</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
