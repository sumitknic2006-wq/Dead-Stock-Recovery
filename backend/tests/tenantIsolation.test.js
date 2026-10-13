/**
 * StockSaathi AI — Strict Multi-Merchant Tenant Isolation Test Suite (Phase 11)
 *
 * This test suite validates the core business security requirement:
 * EVERY MERCHANT MUST ACCESS ONLY THEIR OWN DATA.
 *
 * Verifies:
 * 1. Unauthenticated requests to protected endpoints return 401 Unauthorized.
 * 2. Cross-merchant inventory isolation (Merchant B cannot view, edit, or delete Merchant A's products).
 * 3. Scoped unique SKU indexing (Merchant A and B can have the same SKU without collision).
 * 4. Aggregated metrics & dashboard KPIs are strictly merchant-scoped.
 * 5. Dead stock analysis & summary cannot see another merchant's stock.
 * 6. Profit-safe discount engine cannot reference another merchant's products.
 * 7. 7-Day Recovery Plans and action updates are strictly merchant-isolated.
 * 8. WhatsApp campaigns cannot be generated or accessed from another merchant's inventory.
 * 9. Client cannot spoof ownership via merchantId in request bodies.
 */

import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import Merchant from '../models/Merchant.model.js';
import Product from '../models/Product.model.js';
import RecoveryPlan from '../models/RecoveryPlan.model.js';
import Campaign from '../models/Campaign.model.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Multi-Merchant Data Isolation & Access Controls (Phase 11)', () => {
  let server;
  let baseUrl;

  let merchantAlpha;
  let tokenAlpha;

  let merchantBeta;
  let tokenBeta;

  let alphaProductId;
  const sharedSku = `SHARED-SKU-${Date.now()}`;

  before(async () => {
    await connectDB();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Create Merchant Alpha
    merchantAlpha = await Merchant.create({
      name: 'Alpha Retailer',
      email: `alpha_${Date.now()}@kirana.test`,
      password: 'Password123!',
      businessName: 'Alpha Kirana Store',
    });
    tokenAlpha = generateToken(merchantAlpha);

    // Create Merchant Beta
    merchantBeta = await Merchant.create({
      name: 'Beta Retailer',
      email: `beta_${Date.now()}@kirana.test`,
      password: 'Password123!',
      businessName: 'Beta Provision Mart',
    });
    tokenBeta = generateToken(merchantBeta);
  });

  after(async () => {
    // Clean up created records for both test merchants
    if (merchantAlpha?._id) {
      await Product.deleteMany({ merchantId: merchantAlpha._id });
      await RecoveryPlan.deleteMany({ merchantId: merchantAlpha._id });
      await Campaign.deleteMany({ merchantId: merchantAlpha._id });
      await Merchant.findByIdAndDelete(merchantAlpha._id);
    }
    if (merchantBeta?._id) {
      await Product.deleteMany({ merchantId: merchantBeta._id });
      await RecoveryPlan.deleteMany({ merchantId: merchantBeta._id });
      await Campaign.deleteMany({ merchantId: merchantBeta._id });
      await Merchant.findByIdAndDelete(merchantBeta._id);
    }

    if (server) await new Promise((r) => server.close(r));
    await disconnectDB();
  });

  describe('1. Unauthenticated Route Protection', () => {
    test('GET /api/products — unauthenticated request returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/products`);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('Authentication required'));
    });

    test('POST /api/products — unauthenticated request returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked Item', sku: 'HACK-1', category: 'General', purchaseCost: 10, sellingPrice: 20, quantity: 5 }),
      });
      assert.strictEqual(res.status, 401);
    });

    test('GET /api/analysis/dead-stock — unauthenticated request returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/analysis/dead-stock`);
      assert.strictEqual(res.status, 401);
    });

    test('GET /api/recovery/plan — unauthenticated request returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan`);
      assert.strictEqual(res.status, 401);
    });

    test('GET /api/campaigns — unauthenticated request returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns`);
      assert.strictEqual(res.status, 401);
    });
  });

  describe('2. Multi-Tenant Inventory Isolation', () => {
    test('Merchant Alpha creates a product successfully', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlpha}`,
        },
        body: JSON.stringify({
          name: 'Alpha Premium Basmati Rice 5kg',
          sku: sharedSku,
          category: 'Grains',
          purchaseCost: 400,
          sellingPrice: 550,
          quantity: 20,
          lastSaleDate: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.merchantId, merchantAlpha._id.toString());
      alphaProductId = json.data._id;
    });

    test('Merchant Beta CANNOT access Merchant Alpha product by ID (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${alphaProductId}`, {
        headers: {
          Authorization: `Bearer ${tokenBeta}`,
        },
      });

      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('not found'));
    });

    test('Merchant Beta product list does NOT contain Merchant Alpha products', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: {
          Authorization: `Bearer ${tokenBeta}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.length, 0, 'Merchant Beta has 0 products');
    });

    test('Merchant Beta CANNOT update Merchant Alpha product (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${alphaProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          sellingPrice: 999,
        }),
      });

      assert.strictEqual(res.status, 404);
    });

    test('Merchant Beta CANNOT delete Merchant Alpha product (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${alphaProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenBeta}`,
        },
      });

      assert.strictEqual(res.status, 404);

      // Verify product is still alive in DB
      const alphaProd = await Product.findById(alphaProductId);
      assert.ok(alphaProd, 'Alpha product still exists intact');
    });

    test('Merchant Beta CAN create a product with the SAME SKU without conflict', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          name: 'Beta Basmati Rice 5kg',
          sku: sharedSku, // Exact same SKU
          category: 'Grains',
          purchaseCost: 420,
          sellingPrice: 580,
          quantity: 10,
        }),
      });

      assert.strictEqual(res.status, 201, 'Same SKU allowed across different merchants');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.merchantId, merchantBeta._id.toString());
    });

    test('Merchant Alpha CANNOT duplicate their OWN SKU (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlpha}`,
        },
        body: JSON.stringify({
          name: 'Duplicate Alpha Rice',
          sku: sharedSku,
          category: 'Grains',
          purchaseCost: 400,
          sellingPrice: 550,
          quantity: 5,
        }),
      });

      assert.strictEqual(res.status, 409);
    });

    test('Ownership spoofing via request body is prevented', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          name: 'Spoof Test Item',
          sku: `SPOOF-${Date.now()}`,
          category: 'General',
          purchaseCost: 100,
          sellingPrice: 150,
          quantity: 2,
          merchantId: merchantAlpha._id.toString(), // Attempting to spoof Merchant Alpha ownership
        }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      // Server must enforce authenticated merchantBeta identity
      assert.strictEqual(json.data.merchantId, merchantBeta._id.toString(), 'Spoofed merchantId was overridden by server');
    });

    test('Dashboard inventory summaries are strictly merchant-specific', async () => {
      const resAlpha = await fetch(`${baseUrl}/api/products/summary`, {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      const alphaSummary = (await resAlpha.json()).data;

      const resBeta = await fetch(`${baseUrl}/api/products/summary`, {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });
      const betaSummary = (await resBeta.json()).data;

      assert.strictEqual(alphaSummary.totalProducts, 1);
      assert.strictEqual(alphaSummary.totalUnitsInStock, 20);

      assert.strictEqual(betaSummary.totalProducts, 2); // 1 shared SKU product + 1 spoof test item
      assert.strictEqual(betaSummary.totalUnitsInStock, 12);
    });
  });

  describe('3. Multi-Tenant Dead Stock Analysis Isolation', () => {
    test('Dead stock analysis only includes products owned by requesting merchant', async () => {
      const resAlpha = await fetch(`${baseUrl}/api/analysis/dead-stock`, {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      const jsonAlpha = await resAlpha.json();

      assert.strictEqual(jsonAlpha.data.length, 1);
      assert.strictEqual(jsonAlpha.data[0].productId, alphaProductId);

      const resBeta = await fetch(`${baseUrl}/api/analysis/dead-stock`, {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });
      const jsonBeta = await resBeta.json();

      // Merchant Beta's analysis must not contain Alpha's product
      const hasAlphaProduct = jsonBeta.data.some((p) => p.productId === alphaProductId);
      assert.strictEqual(hasAlphaProduct, false);
    });
  });

  describe('4. Multi-Tenant Discount Calculation Isolation', () => {
    test('Merchant Beta CANNOT calculate discount using Merchant Alpha product ID (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/discounts/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          productId: alphaProductId,
          constraintType: 'minimum_profit',
          minimumDesiredProfitPerUnit: 50,
          discountPercent: 15,
        }),
      });

      assert.strictEqual(res.status, 404);
    });

    test('Merchant Beta CANNOT request discount recommendation for Merchant Alpha product ID (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/discounts/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          productId: alphaProductId,
        }),
      });

      assert.strictEqual(res.status, 404);
    });
  });

  describe('5. Multi-Tenant 7-Day Recovery Plan Isolation', () => {
    let alphaActionId;

    test('Merchant Alpha generates recovery plan containing only Alpha products', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlpha}`,
        },
        body: JSON.stringify({ forceReset: true }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.merchantId, merchantAlpha._id.toString());
      assert.ok(json.data.actions.length > 0);
      assert.strictEqual(json.data.actions[0].productId, alphaProductId);
      alphaActionId = json.data.actions[0]._id;
    });

    test('Merchant Beta CANNOT view Merchant Alpha recovery plan', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan`, {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      // Beta's plan must be Beta's own plan, NOT Alpha's
      assert.notStrictEqual(json.data.merchantId, merchantAlpha._id.toString());
    });

    test('Merchant Beta CANNOT update action status on Merchant Alpha plan (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/actions/${alphaActionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Unauthorized attempt by Beta',
        }),
      });

      assert.strictEqual(res.status, 404);
    });
  });

  describe('6. Multi-Tenant WhatsApp Campaign Isolation', () => {
    let alphaCampaignId;

    test('Merchant Beta CANNOT generate campaign using Merchant Alpha product (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenBeta}`,
        },
        body: JSON.stringify({
          productId: alphaProductId,
          campaignType: 'flash_sale',
          language: 'english',
        }),
      });

      assert.strictEqual(res.status, 404);
    });

    test('Merchant Alpha generates campaign successfully', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlpha}`,
        },
        body: JSON.stringify({
          productId: alphaProductId,
          campaignType: 'flash_sale',
          language: 'english',
          discountPercent: 10,
        }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.merchantId, merchantAlpha._id.toString());
      alphaCampaignId = json.data._id;
    });

    test('Merchant Beta CANNOT view Merchant Alpha campaign by ID (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/${alphaCampaignId}`, {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });

      assert.strictEqual(res.status, 404);
    });

    test('Merchant Beta CANNOT archive Merchant Alpha campaign (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/${alphaCampaignId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });

      assert.strictEqual(res.status, 404);
    });
  });
});
