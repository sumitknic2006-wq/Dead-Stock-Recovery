/**
 * StockSaathi AI — Inventory API Service (Phase 5)
 *
 * Extends the existing api.js service (apiRequest, ApiError, API_BASE_URL).
 * All product operations go through this file.
 * Never import API_BASE_URL directly — use apiRequest which resolves it dynamically.
 */

import { apiRequest, ApiError, getApiBaseUrl } from './api.js';

// ── Product CRUD ──────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of products.
 *
 * @param {{ search?, category?, sortBy?, order?, page?, limit? }} params
 * @returns {Promise<{ data: Product[], pagination: Pagination }>}
 */
export async function fetchProducts(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.order) qs.set('order', params.order);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const query = qs.toString();
  return apiRequest(`/products${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Fetch a single product by ID.
 * @param {string} id
 * @returns {Promise<{ data: Product }>}
 */
export async function fetchProduct(id) {
  return apiRequest(`/products/${id}`, { method: 'GET' });
}

/**
 * Create a new product.
 * @param {object} payload
 * @returns {Promise<{ data: Product }>}
 */
export async function createProduct(payload) {
  return apiRequest('/products', { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * Update a product.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<{ data: Product }>}
 */
export async function updateProduct(id, payload) {
  return apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

/**
 * Delete a product.
 * @param {string} id
 * @returns {Promise<{ data: { deleted: boolean, id: string } }>}
 */
export async function deleteProduct(id) {
  return apiRequest(`/products/${id}`, { method: 'DELETE' });
}

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * Fetch aggregated inventory summary metrics.
 * @returns {Promise<{ data: InventorySummary }>}
 */
export async function fetchInventorySummary() {
  return apiRequest('/products/summary', { method: 'GET' });
}

// ── CSV Import ────────────────────────────────────────────────────────────────

/**
 * Sends a CSV file for preview (validation only, no DB write).
 * @param {File} file
 * @returns {Promise<CsvPreviewResult>}
 */
export async function previewCsvImport(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Use fetch directly — apiRequest forces Content-Type: application/json
  const url = `${getApiBaseUrl()}/products/csv/preview`;

  let response;
  try {
    response = await fetch(url, { method: 'POST', body: formData });
  } catch (networkError) {
    throw new ApiError(
      `Cannot connect to backend: ${networkError.message}`,
      0,
      { originalError: networkError.message }
    );
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }
  return data;
}

/**
 * Commits a validated CSV file to the database.
 * @param {File} file
 * @returns {Promise<CsvImportResult>}
 */
export async function commitCsvImport(file) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${getApiBaseUrl()}/products/csv/import`;

  let response;
  try {
    response = await fetch(url, { method: 'POST', body: formData });
  } catch (networkError) {
    throw new ApiError(
      `Cannot connect to backend: ${networkError.message}`,
      0,
      { originalError: networkError.message }
    );
  }

  const data = await response.json();
  if (!response.ok && response.status !== 207) {
    throw new ApiError(
      data?.error?.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }
  return data;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

/**
 * Downloads the CSV export for the current filter state.
 * Triggers a browser file download.
 *
 * @param {{ search?, category? }} filters
 */
export async function downloadCsvExport(filters = {}) {
  const qs = new URLSearchParams();
  if (filters.search) qs.set('search', filters.search);
  if (filters.category) qs.set('category', filters.category);

  const url = `${getApiBaseUrl()}/products/csv/export${qs.toString() ? `?${qs.toString()}` : ''}`;

  let response;
  try {
    response = await fetch(url, { method: 'GET' });
  } catch (networkError) {
    throw new ApiError(`Cannot connect to backend: ${networkError.message}`, 0);
  }

  if (!response.ok) {
    throw new ApiError(`Export failed: HTTP ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = `stocksaathi-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);
}
