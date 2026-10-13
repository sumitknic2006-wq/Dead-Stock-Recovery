/**
 * StockSaathi AI — Campaign API Client (Phase 9)
 *
 * Frontend service for WhatsApp Clearance Campaign generation,
 * campaign history, editing, archiving, and health checks.
 */

import { apiRequest } from './api.js';

/**
 * Generates and saves a profit-safe promotional campaign.
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {'flash_sale'|'clearance'|'bundle_offer'|'near_expiry'} params.campaignType
 * @param {'all_customers'|'repeat_customers'|'local_customers'|'custom'} [params.targetAudience]
 * @param {'english'|'hindi'|'hinglish'} [params.language]
 * @param {'friendly'|'urgent'|'professional'} [params.tone]
 * @param {number} [params.discountPercent]
 * @param {string} [params.customInstructions]
 * @param {string} [params.campaignName]
 */
export async function generateCampaign(params) {
  return apiRequest('/campaigns/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Retrieves paginated list of campaigns with optional filters.
 *
 * @param {Object} [query]
 * @param {number} [query.page=1]
 * @param {number} [query.limit=10]
 * @param {string} [query.status]
 * @param {string} [query.campaignType]
 * @param {string} [query.language]
 * @param {string} [query.productId]
 */
export async function fetchCampaigns(query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page);
  if (query.limit) params.set('limit', query.limit);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.campaignType && query.campaignType !== 'all') params.set('campaignType', query.campaignType);
  if (query.language && query.language !== 'all') params.set('language', query.language);
  if (query.productId) params.set('productId', query.productId);

  const qs = params.toString();
  return apiRequest(qs ? `/campaigns?${qs}` : '/campaigns');
}

/**
 * Retrieves a single campaign by ID.
 *
 * @param {string} id
 */
export async function fetchCampaignById(id) {
  return apiRequest(`/campaigns/${id}`);
}

/**
 * Updates campaign message text, status, audience, tone, or discount.
 *
 * @param {string} id
 * @param {Object} payload
 */
export async function updateCampaign(id, payload) {
  return apiRequest(`/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Archives a campaign without deleting historical records.
 *
 * @param {string} id
 */
export async function archiveCampaign(id) {
  return apiRequest(`/campaigns/${id}/archive`, {
    method: 'POST',
  });
}

/**
 * Checks campaign service status and database connectivity.
 */
export async function getCampaignHealth() {
  return apiRequest('/campaigns/health');
}
