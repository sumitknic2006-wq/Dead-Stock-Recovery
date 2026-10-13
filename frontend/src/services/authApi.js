/**
 * StockSaathi AI — Merchant Authentication API Client (Phase 11)
 *
 * Provides typed helpers for merchant registration, login, logout,
 * and profile retrieval. Updates local auth tokens upon successful auth.
 */

import { apiRequest, setAuthToken, clearAuthToken } from './api.js';

/**
 * Register a new merchant account
 *
 * @param {object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {string} [payload.name]
 * @param {string} [payload.businessName]
 * @param {string} [payload.storeCategory]
 * @returns {Promise<object>} { success, message, data: { merchant, token } }
 */
export async function registerMerchant({
  email,
  password,
  name,
  businessName,
  storeCategory,
}) {
  const res = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name,
      businessName,
      storeCategory,
    }),
  });

  if (res?.data?.token) {
    setAuthToken(res.data.token);
  }

  return res;
}

/**
 * Log in an existing merchant
 *
 * @param {object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<object>} { success, message, data: { merchant, token } }
 */
export async function loginMerchant({ email, password }) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res?.data?.token) {
    setAuthToken(res.data.token);
  }

  return res;
}

/**
 * Log out current authenticated merchant
 * Clears local token and notifies backend to invalidate cookie
 *
 * @returns {Promise<object>} { success, message }
 */
export async function logoutMerchant() {
  try {
    const res = await apiRequest('/auth/logout', {
      method: 'POST',
    });
    return res;
  } finally {
    clearAuthToken();
  }
}

/**
 * Get current authenticated merchant profile
 *
 * @returns {Promise<object>} { success, data: merchant }
 */
export async function getMerchantProfile() {
  return apiRequest('/auth/me', {
    method: 'GET',
  });
}
