/**
 * StockSaathi AI — CsvImportModal (Phase 5)
 * Two-step CSV import: preview → confirm commit.
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, X, ChevronRight } from 'lucide-react';
import { previewCsvImport, commitCsvImport } from '../services/inventoryApi.js';

const STEPS = { IDLE: 'idle', PREVIEWING: 'previewing', PREVIEW: 'preview', IMPORTING: 'importing', DONE: 'done' };

export default function CsvImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(STEPS.IDLE);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function reset() {
    setStep(STEPS.IDLE);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
      setError('Only .csv files are accepted.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB limit.');
      return;
    }
    setFile(f);
    setError(null);
    setPreview(null);
    setResult(null);
  }

  async function handlePreview() {
    if (!file) return;
    setStep(STEPS.PREVIEWING);
    setError(null);
    try {
      const data = await previewCsvImport(file);
      setPreview(data.data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(err.message || 'Preview failed. Please check the file and try again.');
      setStep(STEPS.IDLE);
    }
  }

  async function handleCommit() {
    if (!file || !preview) return;
    setStep(STEPS.IMPORTING);
    setError(null);
    try {
      const data = await commitCsvImport(file);
      setResult(data.data);
      setStep(STEPS.DONE);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err.message || 'Import failed. Please try again.');
      setStep(STEPS.PREVIEW);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Import Products via CSV</h2>
              <p className="text-xs text-slate-500">Required columns: name, sku, category, purchaseCost, sellingPrice, quantity</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step: File pick */}
          {(step === STEPS.IDLE || step === STEPS.PREVIEWING) && (
            <div>
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-blue-700">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Click to select a CSV file</p>
                    <p className="text-xs text-slate-400 mt-1">Max 5 MB · .csv format only</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />

              {/* CSV Template */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <p className="font-semibold text-slate-700 mb-1">Expected CSV headers:</p>
                <code className="text-[11px] text-blue-700 font-mono break-all">
                  name,sku,category,purchaseCost,sellingPrice,quantity,supplierName,dateAdded,lastSaleDate,expiryDate,condition,notes
                </code>
                <p className="text-slate-400 mt-1">* Bold headers are required. Dates format: YYYY-MM-DD. Condition: new | open-box | refurbished | damaged</p>
              </div>
            </div>
          )}

          {/* Step: Preview results */}
          {(step === STEPS.PREVIEW || step === STEPS.IMPORTING) && preview && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-700">{preview.validCount}</div>
                  <div className="text-xs text-emerald-600">Valid rows</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-red-700">{preview.invalidCount}</div>
                  <div className="text-xs text-red-600">Invalid rows</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-amber-700">{preview.duplicateInFileCount}</div>
                  <div className="text-xs text-amber-600">Duplicate SKUs in file</div>
                </div>
              </div>

              {/* Invalid rows detail */}
              {preview.invalidRows?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">Rows with errors (will be rejected):</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {preview.invalidRows.map((r) => (
                      <div key={r.row} className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs">
                        <span className="font-semibold text-red-800">Row {r.row}:</span>{' '}
                        <span className="text-red-700">{r.errors.join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate SKUs */}
              {preview.duplicatesInFile?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-amber-800 mb-1">Duplicate SKUs within file (only first occurrence will be imported):</p>
                  <p className="text-amber-700 font-mono">{preview.duplicatesInFile.join(', ')}</p>
                </div>
              )}

              {preview.validCount === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium text-center">
                  No valid rows to import. Fix errors and re-upload.
                </div>
              )}
            </div>
          )}

          {/* Step: Done */}
          {step === STEPS.DONE && result && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Import Complete</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-xl font-bold text-emerald-700">{result.created}</div>
                  <div className="text-xs text-emerald-600">Products created</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-xl font-bold text-amber-700">{result.skipped}</div>
                  <div className="text-xs text-amber-600">Skipped (dup. SKU)</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-xl font-bold text-red-700">{result.invalidCount}</div>
                  <div className="text-xs text-red-600">Invalid rows</div>
                </div>
              </div>
              {result.skippedSkus?.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Skipped SKUs (already exist in DB): <strong>{result.skippedSkus.join(', ')}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === STEPS.DONE ? (
            <button onClick={handleClose} className="ml-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm">
              Done
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-100">
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {step === STEPS.PREVIEW && (
                  <button onClick={() => { setStep(STEPS.IDLE); setPreview(null); }} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">
                    Change File
                  </button>
                )}
                {(step === STEPS.IDLE || step === STEPS.PREVIEW) && (
                  <button
                    onClick={step === STEPS.IDLE ? handlePreview : handleCommit}
                    disabled={!file || (step === STEPS.PREVIEW && preview?.validCount === 0) || step === STEPS.IMPORTING}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                  >
                    {step === STEPS.PREVIEWING && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {step === STEPS.IMPORTING && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {step === STEPS.IDLE && <><ChevronRight className="w-3.5 h-3.5" /> Preview & Validate</>}
                    {step === STEPS.PREVIEWING && 'Validating…'}
                    {step === STEPS.PREVIEW && (preview?.validCount > 0 ? <><Upload className="w-3.5 h-3.5" /> Import {preview.validCount} Products</> : 'No valid rows')}
                    {step === STEPS.IMPORTING && 'Importing…'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
