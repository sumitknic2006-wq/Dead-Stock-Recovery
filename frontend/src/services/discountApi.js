/**
 * StockSaathi AI — Discount API Client (Phase 7)
 *
 * Frontend service for profit-safe discount calculation, minimum price floors,
 * and deterministic product-specific recommendations.
 */

import { apiRequest } from './api.js';

/**
 * Calculates financial results and evaluates margin safety for a discount proposal.
 *
 * @param {Object} params
 * @param {string} [params.productId]
 * @param {number} [params.purchaseCost]
 * @param {number} [params.sellingPrice]
 * @param {number} [params.variableCostPerUnit]
 * @param {number} [params.quantity]
 * @param {'minimum_profit'|'minimum_margin'} params.constraintType
 * @param {number} [params.minimumDesiredProfitPerUnit]
 * @param {number} [params.minimumGrossMarginPercent]
 * @param {number} [params.discountPercent]
 * @param {number} [params.proposedSellingPrice]
 */
export async function calculateProposedDiscount(params) {
  return apiRequest('/discounts/calculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Calculates the minimum safe selling price floor under a given constraint.
 *
 * @param {Object} params
 * @param {string} [params.productId]
 * @param {number} [params.purchaseCost]
 * @param {number} [params.sellingPrice]
 * @param {number} [params.variableCostPerUnit]
 * @param {'minimum_profit'|'minimum_margin'} params.constraintType
 * @param {number} [params.minimumDesiredProfitPerUnit]
 * @param {number} [params.minimumGrossMarginPercent]
 */
export async function calculateMinimumSafePrice(params) {
  return apiRequest('/discounts/minimum-price', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Retrieves a deterministic, profit-safe discount recommendation for an inventory product.
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} [params.variableCostPerUnit]
 * @param {number} [params.quantity]
 * @param {'minimum_profit'|'minimum_margin'} [params.constraintType]
 * @param {number} [params.minimumDesiredProfitPerUnit]
 * @param {number} [params.minimumGrossMarginPercent]
 */
export async function fetchDiscountRecommendation(params) {
  return apiRequest('/discounts/recommend', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Checks discount engine health and connectivity.
 */
export async function getDiscountEngineHealth() {
  return apiRequest('/discounts/health');
}
