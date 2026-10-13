/**
 * StockSaathi AI — ProductFormModal (Phase 5)
 * Add / Edit product in a full-screen slide-over panel.
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Package } from 'lucide-react';

const CONDITION_OPTIONS = ['new', 'open-box', 'refurbished', 'damaged'];

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: '',
  purchaseCost: '',
  sellingPrice: '',
  quantity: '',
  supplierName: '',
  dateAdded: new Date().toISOString().slice(0, 10),
  lastSaleDate: '',
  expiryDate: '',
  condition: 'new',
  notes: '',
  unitsSoldDuringPeriod: '',
  minimumDesiredProfitPerUnit: '',
  minimumGrossMarginPercent: '',
};

export default function ProductFormModal({ isOpen, onClose, onSave, product, isSaving, saveError }) {
  const isEdit = !!product;
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setForm({
          name: product.name ?? '',
          sku: product.sku ?? '',
          category: product.category ?? '',
          purchaseCost: product.purchaseCost ?? '',
          sellingPrice: product.sellingPrice ?? '',
          quantity: product.quantity ?? '',
          supplierName: product.supplierName ?? '',
          dateAdded: product.dateAdded ? product.dateAdded.slice(0, 10) : new Date().toISOString().slice(0, 10),
          lastSaleDate: product.lastSaleDate ? product.lastSaleDate.slice(0, 10) : '',
          expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
          condition: product.condition ?? 'new',
          notes: product.notes ?? '',
          unitsSoldDuringPeriod: product.unitsSoldDuringPeriod ?? '',
          minimumDesiredProfitPerUnit: product.minimumDesiredProfitPerUnit ?? '',
          minimumGrossMarginPercent: product.minimumGrossMarginPercent ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setFieldErrors({});
    }
  }, [isOpen, product]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
  };

  // Client-side validation mirror
  function validateForm() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (!form.category.trim()) errs.category = 'Category is required';

    const pc = Number(form.purchaseCost);
    if (form.purchaseCost === '' || isNaN(pc) || pc < 0) errs.purchaseCost = 'Must be a non-negative number';

    const sp = Number(form.sellingPrice);
    if (form.sellingPrice === '' || isNaN(sp) || sp < 0) errs.sellingPrice = 'Must be a non-negative number';

    const qty = Number(form.quantity);
    if (form.quantity === '' || !Number.isInteger(qty) || qty < 0) errs.quantity = 'Must be a non-negative whole number';

    if (form.lastSaleDate && isNaN(new Date(form.lastSaleDate).getTime())) errs.lastSaleDate = 'Invalid date';
    if (form.expiryDate && isNaN(new Date(form.expiryDate).getTime())) errs.expiryDate = 'Invalid date';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload() {
    const p = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      purchaseCost: Number(form.purchaseCost),
      sellingPrice: Number(form.sellingPrice),
      quantity: parseInt(form.quantity, 10),
      condition: form.condition || 'new',
    };
    if (form.supplierName.trim()) p.supplierName = form.supplierName.trim();
    if (form.dateAdded) p.dateAdded = form.dateAdded;
    if (form.lastSaleDate) p.lastSaleDate = form.lastSaleDate;
    if (form.expiryDate) p.expiryDate = form.expiryDate;
    if (form.notes.trim()) p.notes = form.notes.trim();
    if (form.unitsSoldDuringPeriod !== '') p.unitsSoldDuringPeriod = parseInt(form.unitsSoldDuringPeriod, 10);
    if (form.minimumDesiredProfitPerUnit !== '') p.minimumDesiredProfitPerUnit = Number(form.minimumDesiredProfitPerUnit);
    if (form.minimumGrossMarginPercent !== '') p.minimumGrossMarginPercent = Number(form.minimumGrossMarginPercent);
    return p;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    onSave(buildPayload());
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
              <p className="text-xs text-slate-500">{isEdit ? `Editing: ${product.sku}` : 'All required fields marked *'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save Error Banner */}
        {saveError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section: Core */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Product Details</h3>
            <div className="space-y-3">
              <Field label="Product Name *" error={fieldErrors.name}>
                <input id="name" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Bluetooth Headphones Pro" className={inputCls(fieldErrors.name)} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU *" error={fieldErrors.sku}>
                  <input id="sku" value={form.sku} onChange={set('sku')} placeholder="e.g. AUDIO-HP-09" className={inputCls(fieldErrors.sku)} />
                </Field>
                <Field label="Category *" error={fieldErrors.category}>
                  <input id="category" value={form.category} onChange={set('category')} placeholder="e.g. Audio & Sound" className={inputCls(fieldErrors.category)} />
                </Field>
              </div>

              <Field label="Condition">
                <select id="condition" value={form.condition} onChange={set('condition')} className={inputCls()}>
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Section: Pricing & Stock */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pricing & Stock</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Purchase Cost ₹ *" error={fieldErrors.purchaseCost}>
                <input id="purchaseCost" type="number" min="0" step="0.01" value={form.purchaseCost} onChange={set('purchaseCost')} placeholder="0" className={inputCls(fieldErrors.purchaseCost)} />
              </Field>
              <Field label="Selling Price ₹ *" error={fieldErrors.sellingPrice}>
                <input id="sellingPrice" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={set('sellingPrice')} placeholder="0" className={inputCls(fieldErrors.sellingPrice)} />
              </Field>
              <Field label="Quantity *" error={fieldErrors.quantity}>
                <input id="quantity" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} placeholder="0" className={inputCls(fieldErrors.quantity)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Min Profit/Unit ₹">
                <input id="minimumDesiredProfitPerUnit" type="number" min="0" step="0.01" value={form.minimumDesiredProfitPerUnit} onChange={set('minimumDesiredProfitPerUnit')} placeholder="Optional" className={inputCls()} />
              </Field>
              <Field label="Min Gross Margin %">
                <input id="minimumGrossMarginPercent" type="number" min="0" max="100" step="0.1" value={form.minimumGrossMarginPercent} onChange={set('minimumGrossMarginPercent')} placeholder="0–100" className={inputCls()} />
              </Field>
            </div>
          </section>

          {/* Section: Dates */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dates</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date Added">
                <input id="dateAdded" type="date" value={form.dateAdded} onChange={set('dateAdded')} className={inputCls()} />
              </Field>
              <Field label="Last Sale Date" error={fieldErrors.lastSaleDate}>
                <input id="lastSaleDate" type="date" value={form.lastSaleDate} onChange={set('lastSaleDate')} className={inputCls(fieldErrors.lastSaleDate)} />
              </Field>
              <Field label="Expiry Date" error={fieldErrors.expiryDate}>
                <input id="expiryDate" type="date" value={form.expiryDate} onChange={set('expiryDate')} className={inputCls(fieldErrors.expiryDate)} />
              </Field>
            </div>
          </section>

          {/* Section: Supplier & Notes */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Additional Info</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Supplier Name">
                  <input id="supplierName" value={form.supplierName} onChange={set('supplierName')} placeholder="Optional" className={inputCls()} />
                </Field>
                <Field label="Units Sold (Period)">
                  <input id="unitsSoldDuringPeriod" type="number" min="0" step="1" value={form.unitsSoldDuringPeriod} onChange={set('unitsSoldDuringPeriod')} placeholder="Optional" className={inputCls()} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea id="notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="Any relevant notes about this product..." className={`${inputCls()} resize-none`} />
              </Field>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="product-form-id"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function inputCls(err) {
  const base = 'w-full text-xs px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-colors';
  return err
    ? `${base} border-red-300 focus:ring-red-400 focus:border-red-400`
    : `${base} border-slate-200 focus:ring-blue-400 focus:border-blue-400`;
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}
