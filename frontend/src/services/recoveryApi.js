/**
 * StockSaathi AI — Recovery API Client (Phase 8)
 *
 * Frontend service for 7-Day Dead Stock Recovery Action Planner:
 * plan retrieval, progress summaries, plan generation/regeneration, and action status updates.
 */

import { apiRequest } from './api.js';

/**
 * Retrieves the active 7-day recovery action plan, optionally filtered by day, status, or priority.
 *
 * @param {Object} [params]
 * @param {number|string} [params.day]
 * @param {string} [params.status]
 * @param {string} [params.priority]
 */
export async function getActiveRecoveryPlan(params = {}) {
  const query = new URLSearchParams();
  if (params.day) query.set('day', params.day);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);

  const qs = query.toString();
  const endpoint = qs ? `/recovery/plan?${qs}` : '/recovery/plan';

  return apiRequest(endpoint);
}

/**
 * Retrieves overall plan execution progress, action counts, and financial recovery metrics.
 */
export async function getRecoverySummary() {
  return apiRequest('/recovery/summary');
}

/**
 * Generates or regenerates a 7-day recovery plan from live inventory.
 *
 * @param {Object} [options]
 * @param {string|Date} [options.startDate]
 * @param {boolean} [options.preserveCompleted=true]
 * @param {boolean} [options.forceReset=false]
 */
export async function generateRecoveryPlan(options = {}) {
  return apiRequest('/recovery/plan/generate', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

/**
 * Updates an action item's execution status (pending, in_progress, completed, skipped) and optional notes.
 *
 * @param {string} actionId
 * @param {Object} payload
 * @param {'pending'|'in_progress'|'completed'|'skipped'} payload.status
 * @param {string} [payload.notes]
 */
export async function updateRecoveryActionStatus(actionId, payload) {
  if (!actionId) {
    throw new Error('Action ID is required');
  }

  return apiRequest(`/recovery/actions/${actionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Checks recovery service health status.
 */
export async function getRecoveryHealth() {
  return apiRequest('/recovery/health');
}
