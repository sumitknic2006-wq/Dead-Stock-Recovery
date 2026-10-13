/**
 * StockSaathi AI — Campaign History Table (Phase 9)
 *
 * Displays saved WhatsApp promotional campaigns with status filters,
 * pagination, message inspection, clipboard copying, and archiving.
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Archive,
  Eye,
  Calendar,
  Tag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';

export default function CampaignHistoryTable({
  campaigns = [],
  pagination = {},
  loading = false,
  onPageChange,
  onFilterChange,
  onViewCampaign,
  onArchiveCampaign,
  filters = {},
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (campaign) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(campaign.message);
        setCopiedId(campaign._id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      setCopiedId(campaign._id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Campaign Archive & History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical promotional messages saved in MongoDB Atlas with pricing snapshots
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange?.('status', e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filters.campaignType || 'all'}
            onChange={(e) => onFilterChange?.('campaignType', e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="flash_sale">Flash Sale</option>
            <option value="clearance">Clearance</option>
            <option value="bundle_offer">Bundle Offer</option>
            <option value="near_expiry">Near Expiry</option>
          </select>

          <select
            value={filters.language || 'all'}
            onChange={(e) => onFilterChange?.('language', e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Languages</option>
            <option value="english">English</option>
            <option value="hindi">हिंदी (Hindi)</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading campaign history...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No Campaigns Found</p>
          <p className="text-xs text-slate-400">
            Generate your first WhatsApp clearance campaign using the generator above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-2.5 px-3">Campaign Name & Product</th>
                <th className="py-2.5 px-3">Type & Tone</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3 text-right">Offer Price</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {campaigns.map((camp) => {
                const isCopied = copiedId === camp._id;
                const statusStyles = {
                  draft: 'bg-slate-100 text-slate-700 border-slate-200',
                  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                  archived: 'bg-amber-50 text-amber-700 border-amber-200 opacity-70',
                };

                return (
                  <tr key={camp._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Product */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[220px]" title={camp.campaignName}>
                        {camp.campaignName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {camp.productSnapshot?.name} • SKU: {camp.productSnapshot?.sku}
                      </div>
                    </td>

                    {/* Type & Tone */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 capitalize">
                        {camp.campaignType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        {camp.tone} tone • {camp.targetAudience.replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Language */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                        {camp.language}
                      </span>
                    </td>

                    {/* Price & Savings */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-slate-900">
                        ₹{camp.proposedSellingPrice.toLocaleString('en-IN')}
                      </div>
                      {camp.discountPercent > 0 ? (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {camp.discountPercent}% OFF (MRP ₹{camp.productSnapshot?.sellingPrice})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Regular Price</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] border capitalize ${
                          statusStyles[camp.status] || statusStyles.draft
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(camp.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewCampaign?.(camp)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View / Edit message"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(camp)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isCopied
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                          title="Copy message to clipboard"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {camp.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => onArchiveCampaign?.(camp._id)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Archive campaign"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total campaigns)
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
