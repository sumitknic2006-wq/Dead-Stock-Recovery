/**
 * StockSaathi AI — DeleteConfirmDialog (Phase 5)
 */

import React from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

export default function DeleteConfirmDialog({ isOpen, onClose, onConfirm, product, isDeleting }) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Delete Product</h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product summary */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-0.5">
          <p className="text-xs font-semibold text-red-900 truncate">{product.name}</p>
          <p className="text-[11px] text-red-700 font-mono">{product.sku}</p>
          <p className="text-[11px] text-red-600">
            {product.quantity} units · ₹{(product.purchaseCost * product.quantity).toLocaleString('en-IN')} inventory cost
          </p>
        </div>

        <p className="text-xs text-slate-600">
          Are you sure you want to permanently delete <strong>{product.name}</strong>? This will remove the product and all associated data from the database.
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(product._id)}
            disabled={isDeleting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {isDeleting ? 'Deleting…' : 'Delete Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
