/**
 * StockSaathi AI — Product API Tests (Phase 5)
 *
 * Tests for /api/products endpoints.
 * These are integration tests that run against a real Express app.
 * Database operations are skipped when MONGODB_URI is not configured —
 * a clear skip message is printed so results are not fabricated.
 *
 * Run: npm test
 */

import 'dotenv/config';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import { generateToken } from '../middleware/auth.middleware.js';

const testMerchantId = new mongoose.Types.ObjectId();
const testToken = generateToken({
  id: testMerchantId.toString(),
  email: 'product_test_merchant@kirana.store',
  name: 'Product Test Merchant',
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function post(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function put(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function del(baseUrl, path) {
  return fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
}

async function get(baseUrl, path) {
  return fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
}

const SAMPLE_PRODUCT = {
  name: 'Test Wireless Headphones',
  sku: 'TEST-HP-001',
  category: 'Audio',
  purchaseCost: 800,
  sellingPrice: 1500,
  quantity: 10,
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Product API — /api/products (Phase 5)', () => {
  let server;
  let baseUrl;
  let dbConnected = false;

  before(async () => {
    // Attempt DB connection if URI is configured
    const uri = process.env.MONGODB_URI;
    if (uri && uri.trim() !== '') {
      try {
        await connectDB(uri);
        dbConnected = true;
        await Product.deleteMany({ sku: /^TEST-/ });
      } catch {
        console.warn('[Test] WARNING: Could not connect to MongoDB. DB-dependent tests will be skipped.');
      }
    } else {
      console.warn('[Test] MONGODB_URI not set. DB-dependent tests will be skipped.');
    }

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (dbConnected) {
      await Product.deleteMany({ sku: /^TEST-/ });
      await disconnectDB();
    }
    await new Promise((resolve) => server.close(resolve));
  });

  // ── Health regression (preserve Phase 1-3 tests) ─────────────────────────

  test('GET /api/health still returns 200 (regression)', async () => {
    const res = await get(baseUrl, '/api/health');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.status === 'ok' || data.status === 'degraded', 'health status must be ok or degraded');
    assert.ok(typeof data.uptime === 'number');
  });

  // ── Validator unit tests (no DB required) ─────────────────────────────────

  describe('Server-side validation (no DB)', () => {
    test('POST /api/products — rejects missing name', async () => {
      const body = { ...SAMPLE_PRODUCT };
      delete body.name;
      const res = await post(baseUrl, '/api/products', body);
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.fields.some((f) => f.includes('name')));
    });

    test('POST /api/products — rejects missing SKU', async () => {
      const body = { ...SAMPLE_PRODUCT };
      delete body.sku;
      const res = await post(baseUrl, '/api/products', body);
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.ok(data.error.fields.some((f) => f.includes('sku')));
    });

    test('POST /api/products — rejects negative purchaseCost', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, purchaseCost: -100 });
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.ok(data.error.fields.some((f) => f.includes('purchaseCost')));
    });

    test('POST /api/products — rejects negative sellingPrice', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, sellingPrice: -1 });
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.ok(data.error.fields.some((f) => f.includes('sellingPrice')));
    });

    test('POST /api/products — rejects negative quantity', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, quantity: -5 });
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.ok(data.error.fields.some((f) => f.includes('quantity')));
    });

    test('POST /api/products — rejects fractional quantity', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, quantity: 2.5 });
      assert.strictEqual(res.status, 422);
    });

    test('POST /api/products — rejects invalid date for lastSaleDate', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, lastSaleDate: 'not-a-date' });
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.ok(data.error.fields.some((f) => f.includes('lastSaleDate')));
    });

    test('POST /api/products — rejects invalid condition value', async () => {
      const res = await post(baseUrl, '/api/products', { ...SAMPLE_PRODUCT, condition: 'broken' });
      assert.strictEqual(res.status, 422);
    });

    test('GET /api/products/:id — rejects non-ObjectId id', async () => {
      const res = await get(baseUrl, '/api/products/not-an-id');
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('PUT /api/products/:id — rejects non-ObjectId id', async () => {
      const res = await put(baseUrl, '/api/products/bad-id', { name: 'Updated' });
      assert.strictEqual(res.status, 400);
    });

    test('DELETE /api/products/:id — rejects non-ObjectId id', async () => {
      const res = await del(baseUrl, '/api/products/xyz123');
      assert.strictEqual(res.status, 400);
    });
  });

  // ── DB integration tests ───────────────────────────────────────────────────

  describe('CRUD operations (requires MongoDB)', () => {
    let createdId;

    test('POST /api/products — creates a product', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await post(baseUrl, '/api/products', SAMPLE_PRODUCT);
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.sku, 'TEST-HP-001');
      assert.ok(data.data._id);
      createdId = data.data._id;
    });

    test('GET /api/products — returns paginated list', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await get(baseUrl, '/api/products?limit=10&page=1');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.data));
      assert.ok(typeof data.pagination.total === 'number');
    });

    test('GET /api/products — search by name', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await get(baseUrl, '/api/products?search=Wireless+Headphones');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.data.some((p) => p.sku === 'TEST-HP-001'));
    });

    test('GET /api/products — filter by category', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await get(baseUrl, '/api/products?category=Audio');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.data.every((p) => p.category.toLowerCase() === 'audio'));
    });

    test('GET /api/products/:id — returns created product', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      if (!createdId) return;
      const res = await get(baseUrl, `/api/products/${createdId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data._id, createdId);
      assert.strictEqual(data.data.sku, 'TEST-HP-001');
    });

    test('GET /api/products/:id — returns 404 for missing product', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await get(baseUrl, `/api/products/${fakeId}`);
      assert.strictEqual(res.status, 404);
    });

    test('PUT /api/products/:id — updates quantity and selling price', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      if (!createdId) return;
      const res = await put(baseUrl, `/api/products/${createdId}`, {
        quantity: 25,
        sellingPrice: 1799,
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.quantity, 25);
      assert.strictEqual(data.data.sellingPrice, 1799);
    });

    test('PUT /api/products/:id — returns 404 for missing product', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await put(baseUrl, `/api/products/${fakeId}`, { quantity: 5 });
      assert.strictEqual(res.status, 404);
    });

    test('POST /api/products — rejects duplicate SKU (409)', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await post(baseUrl, '/api/products', {
        ...SAMPLE_PRODUCT,
        name: 'Duplicate SKU Product',
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.ok(data.error.message.includes('SKU'));
    });

    test('GET /api/products/summary — returns aggregated metrics', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      const res = await get(baseUrl, '/api/products/summary');
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(typeof data.data.totalProducts === 'number');
      assert.ok(typeof data.data.totalUnitsInStock === 'number');
      assert.ok(typeof data.data.totalInventoryCostValue === 'number');
      assert.ok(typeof data.data.potentialSalesValue === 'number');
      assert.ok(typeof data.data.estimatedGrossProfit === 'number');
      assert.ok(data.data.totalInventoryCostValue >= 0);
      assert.ok(data.data.potentialSalesValue >= 0);
    });

    test('DELETE /api/products/:id — deletes the product', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      if (!createdId) return;
      const res = await del(baseUrl, `/api/products/${createdId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.deleted, true);
    });

    test('DELETE /api/products/:id — returns 404 after deletion', async (t) => {
      if (!dbConnected) { t.skip('MongoDB not connected'); return; }
      if (!createdId) return;
      const res = await del(baseUrl, `/api/products/${createdId}`);
      assert.strictEqual(res.status, 404);
    });
  });

  // ── CSV tests (no DB for validation, DB for import) ───────────────────────

  describe('CSV validation', () => {
    test('parseCsvBuffer — detects missing required headers', async () => {
      const { parseCsvBuffer } = await import('../services/product.service.js');
      const badCsv = Buffer.from('name,sku\nProduct A,SKU-001\n');
      const result = parseCsvBuffer(badCsv);
      assert.ok(result.missingHeaders.length > 0);
      assert.ok(result.missingHeaders.includes('category'));
    });

    test('parseCsvBuffer — validates rows with negative prices', async () => {
      const { parseCsvBuffer } = await import('../services/product.service.js');
      const csv = Buffer.from('name,sku,category,purchasecost,sellingprice,quantity\nBad Product,SKU-BAD,Electronics,-100,200,5\n');
      const result = parseCsvBuffer(csv);
      assert.ok(result.missingHeaders.length === 0);
      assert.strictEqual(result.validRows.length, 0);
      assert.strictEqual(result.invalidRows.length, 1);
      assert.ok(result.invalidRows[0].errors.some((e) => e.includes('purchaseCost')));
    });

    test('parseCsvBuffer — detects in-file duplicate SKUs', async () => {
      const { parseCsvBuffer } = await import('../services/product.service.js');
      const csv = Buffer.from(
        'name,sku,category,purchasecost,sellingprice,quantity\n' +
        'Product A,SKU-DUP,Electronics,100,200,5\n' +
        'Product B,SKU-DUP,Electronics,100,200,3\n'
      );
      const result = parseCsvBuffer(csv);
      assert.ok(result.duplicatesInFile.includes('SKU-DUP'));
    });

    test('parseCsvBuffer — accepts valid rows', async () => {
      const { parseCsvBuffer } = await import('../services/product.service.js');
      const csv = Buffer.from(
        'name,sku,category,purchasecost,sellingprice,quantity\n' +
        'Good Product,SKU-GOOD,Electronics,100,200,5\n'
      );
      const result = parseCsvBuffer(csv);
      assert.strictEqual(result.validRows.length, 1);
      assert.strictEqual(result.invalidRows.length, 0);
    });
  });
});
