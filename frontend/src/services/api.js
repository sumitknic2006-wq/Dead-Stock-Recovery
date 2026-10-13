/**
 * StockSaathi AI — Frontend API Service
 * 
 * Reusable HTTP client and service helpers using standard Fetch API.
 * Configured via Vite environment variable VITE_API_BASE_URL.
 */

/**
 * Dynamically resolves the API base URL from Vite environment or Node process.env
 * Defaults to the documented local default: http://localhost:5000/api
 */
export function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    console.warn('[StockSaathi AI] Notice: VITE_API_BASE_URL is not configured in Vercel environment variables.');
  }
  return 'http://localhost:5001/api';
}

export const API_BASE_URL = getApiBaseUrl();

let inMemoryToken = null;
let onUnauthorizedCallback = null;

export function getAuthToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem('stocksaathi_auth_token') || null;
    }
  } catch {
    // sessionStorage might be blocked in some sandbox environments
  }
  return null;
}

export function setAuthToken(token) {
  inMemoryToken = token || null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (token) {
        window.sessionStorage.setItem('stocksaathi_auth_token', token);
      } else {
        window.sessionStorage.removeItem('stocksaathi_auth_token');
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export function setOnUnauthorizedCallback(cb) {
  onUnauthorizedCallback = cb;
}

/**
 * Standard API Error wrapper containing status codes and structured details
 */
export class ApiError extends Error {
  constructor(message, statusCode = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Core JSON HTTP request helper
 *
 * @param {string} endpoint - API path relative to base URL (e.g., '/health')
 * @param {RequestInit & { baseUrl?: string }} [options={}] - Fetch configuration options
 * @returns {Promise<any>} Parsed JSON payload
 * @throws {ApiError} Structured error on network, HTTP, or parsing failure
 */
export async function apiRequest(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = (options.baseUrl || getApiBaseUrl()).replace(/\/+$/, '');
  const url = `${baseUrl}${normalizedEndpoint}`;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    credentials: options.credentials || 'include',
    headers,
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    // Network errors (connection refused, backend down, CORS blocks)
    throw new ApiError(
      `Cannot connect to backend at ${url}. Ensure Express server is running. (${networkError.message})`,
      0,
      { originalError: networkError.message }
    );
  }

  // Attempt to parse JSON response
  let responseData;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (parseError) {
      throw new ApiError(
        `Failed to parse JSON response from server (${parseError.message})`,
        response.status,
        { parseError: parseError.message }
      );
    }
  } else {
    // Non-JSON response (e.g. HTML 502/504 error page)
    const textData = await response.text();
    responseData = { text: textData };
    if (!response.ok) {
      throw new ApiError(
        `Server returned non-JSON HTTP ${response.status} error`,
        response.status,
        { raw: textData }
      );
    }
  }

  // Validate HTTP status
  if (!response.ok) {
    if (response.status === 401 && typeof onUnauthorizedCallback === 'function') {
      try {
        onUnauthorizedCallback(responseData);
      } catch {
        // Callback errors should not suppress throwing ApiError
      }
    }
    const errorMessage =
      responseData?.error?.message ||
      responseData?.message ||
      `HTTP Error ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData;
}

/**
 * Health Check API Request
 * Fetches operational status from backend GET /api/health
 *
 * @param {string} [baseUrl] - Optional override for API base URL
 * @returns {Promise<{status: string, message: string, timestamp: string, uptime: number, environment: string}>}
 */
export async function getBackendHealth(baseUrl) {
  return apiRequest('/health', { method: 'GET', ...(baseUrl ? { baseUrl } : {}) });
}
