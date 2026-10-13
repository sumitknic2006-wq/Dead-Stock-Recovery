/**
 * StockSaathi AI — Dead Stock Analysis API Service (Phase 6)
 *
 * Connects frontend to the real backend Dead Stock analysis engine:
 * - GET /api/analysis/dead-stock (paginated, filtered, sorted)
 * - GET /api/analysis/dead-stock/summary (portfolio-wide metrics & top priority items)
 */

import { apiRequest } from './api.js';

/**
 * Fetches paginated dead stock analysis products from the backend.
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.category]
 * @param {string} [params.classification] - healthy | slow_moving | at_risk | critical_dead_stock | insufficient_data
 * @param {string} [params.severity] - Low | Medium | High | Critical
 * @param {string} [params.sortBy] - daysSinceLastSale | riskScore | inventoryCostValue | quantity | name
 * @param {string} [params.order] - asc | desc
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<{ data: Array<object>, pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export async function fetchDeadStockAnalysis(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.classification) qs.set('classification', params.classification);
  if (params.severity) qs.set('severity', params.severity);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.order) qs.set('order', params.order);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const query = qs.toString();
  return apiRequest(`/analysis/dead-stock${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Fetches portfolio-wide dead stock aggregations and top 6 priority items for dashboard.
 *
 * @returns {Promise<{ data: { summary: object, topPriorityItems: Array<object> } }>}
 */
export async function fetchDeadStockSummary() {
  return apiRequest('/analysis/dead-stock/summary', { method: 'GET' });
}
