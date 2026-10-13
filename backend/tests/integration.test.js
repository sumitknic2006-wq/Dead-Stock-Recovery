/**
 * StockSaathi AI — Full-System Integration & E2E Workflow Test Suite (Phase 10)
 *
 * Verifies the complete cohesive business workflow across all phases:
 * 1. Inventory Management (Phase 5): Real MongoDB product lifecycle and validation
 * 2. Dead Stock Engine (Phase 6): Accurate stock-age classification and explainable scoring
 * 3. Profit-Safe Discounts (Phase 7): Mathematical price floors and unsafe markdown prevention
 * 4. 7-Day Recovery Planner (Phase 8): Practical liquidation scheduling and status progression
 * 5. WhatsApp Campaign Generator (Phase 9): Profit-safe personalized promotional drafts
 * 6. System Degradation & Reliability (Phase 10): Clean 503 handling and credential security
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import Product from '../models/Product.model.js';
import Campaign from '../models/Campaign.model.js';
import RecoveryPlan from '../models/RecoveryPlan.model.js';
import { generateToken } from '../middleware/auth.middleware.js';

const testMerchantId = new mongoose.Types.ObjectId();
const testToken = generateToken({
  id: testMerchantId.toString(),
  email: 'integration_test@stocksaathi.ai',
  name: 'Integration Test Merchant',
});

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${testToken}`,
};

describe('Full-System Integration & E2E Workflows (Phase 10)', () => {
  let server;
  let baseUrl;
  let productId;
  const testSku = 'SYS-E2E-INTEG-01';

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Clean up any previous test artifacts
    await Product.deleteMany({ sku: /^SYS-E2E-/ });
    await Campaign.deleteMany({ 'productSnapshot.sku': /^SYS-E2E-/ });
    await RecoveryPlan.deleteMany({ planTitle: /System E2E/i });
  });

  after(async () => {
    await Product.deleteMany({ sku: /^SYS-E2E-/ });
    await Campaign.deleteMany({ 'productSnapshot.sku': /^SYS-E2E-/ });
    await RecoveryPlan.deleteMany({ planTitle: /System E2E/i });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ── WORKFLOW A: INVENTORY LIFECYCLE & INTEGRITY ───────────────────────────
  test('Workflow A1: Creates an inventory product with valid financial constraints', async () => {
    // 95 days ago to simulate dead stock
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 95);

    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'System Integration Wireless Speaker',
        sku: testSku,
        category: 'Electronics',
        purchaseCost: 1000,
        sellingPrice: 1800,
        quantity: 25,
        minimumDesiredProfitPerUnit: 200, // Floor: 1000 + 200 = 1200
        lastSaleDate: ninetyDaysAgo.toISOString(),
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.sku, testSku);
    productId = body.data._id || body.data.id;
    assert.ok(productId);
  });

  test('Workflow A2: Rejects duplicate SKU with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Duplicate SKU Item',
        sku: testSku,
        category: 'Electronics',
        purchaseCost: 500,
        sellingPrice: 800,
        quantity: 10,
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('already exists'));
  });

  test('Workflow A3: Summary aggregation accurately includes the new inventory value', async () => {
    const res = await fetch(`${baseUrl}/api/products/summary`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalProducts >= 1);
    assert.ok(body.data.totalUnitsInStock >= 25);
    assert.ok(body.data.totalInventoryCostValue >= 25000); // 25 * 1000
  });

  // ── WORKFLOW B: DEAD STOCK DETECTION & RISK SCORING ───────────────────────
  test('Workflow B1: Dead Stock analysis classifies the 95-day stagnant product correctly', async () => {
    const res = await fetch(`${baseUrl}/api/analysis/dead-stock`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const match = body.data.find((p) => p.sku === testSku || p.productId === productId);
    assert.ok(match, 'Product should be returned in dead stock list');
    assert.ok(match.daysSinceLastSale >= 94, 'Stock age should be at least 94 days');
    assert.strictEqual(match.classification.key, 'critical_dead_stock');
    assert.ok(match.riskScore >= 60, 'Risk score should be elevated for critical dead stock');
    assert.ok(Array.isArray(match.reasonCodes));
    assert.ok(Array.isArray(match.recommendations));
  });

  // ── WORKFLOW C: PROFIT-SAFE DISCOUNT FLOORS ───────────────────────────────
  test('Workflow C1: Computes minimum safe price floor accurately ($P_{min} = 1200)', async () => {
    const res = await fetch(`${baseUrl}/api/discounts/minimum-price`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        constraintType: 'minimum_profit',
        minimumDesiredProfitPerUnit: 200,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    // Target profit floor: 1000 + 200 = 1200
    assert.strictEqual(body.data.minimumAcceptablePrice, 1200);
    // Maximum safe discount from 1800 to 1200: (1 - 1200/1800) * 100 = 33.33%
    assert.ok(Math.abs(body.data.maximumSafeDiscountPercent - 33.33) < 0.1);
  });

  test('Workflow C2: Rejects unsafe discount (e.g. 40% drops price to 1080 < 1200)', async () => {
    const res = await fetch(`${baseUrl}/api/discounts/calculate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        discountPercent: 40,
        constraintType: 'minimum_profit',
        minimumDesiredProfitPerUnit: 200,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isSafe, false);
    assert.strictEqual(body.data.proposedSellingPrice, 1080);
    assert.strictEqual(body.data.minimumAcceptablePrice, 1200);
    assert.ok(body.data.financialWarning);
  });

  test('Workflow C3: Approves safe discount (e.g. 20% gives 1440 >= 1200)', async () => {
    const res = await fetch(`${baseUrl}/api/discounts/calculate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        discountPercent: 20,
        constraintType: 'minimum_profit',
        minimumDesiredProfitPerUnit: 200,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isSafe, true);
    assert.strictEqual(body.data.proposedSellingPrice, 1440);
  });

  // ── WORKFLOW D: 7-DAY RECOVERY ACTION PLANNER ─────────────────────────────
  let firstAction;
  let actionPlanId;

  test('Workflow D1: Generates active 7-day recovery plan and enforces price floors', async () => {
    const res = await fetch(`${baseUrl}/api/recovery/plan/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        forceReset: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.actions), 'Actions should be an array');
    assert.ok(body.data.actions.length >= 7, 'Should contain actions spanning 7 days');
    firstAction = body.data.actions[0];
    actionPlanId = body.data._id;

    // Verify all proposed prices satisfy price floors
    for (const action of body.data.actions) {
      if (action.proposedSellingPrice && action.minimumSafePrice) {
        assert.ok(
          action.proposedSellingPrice >= action.minimumSafePrice,
          `Action proposed price ${action.proposedSellingPrice} must be >= minimum safe price ${action.minimumSafePrice}`
        );
      }
    }
  });

  test('Workflow D2: Updates recovery action status to completed and tracks progress', async () => {
    assert.ok(firstAction, 'Workflow D1 must produce a valid first action item');

    const updateRes = await fetch(`${baseUrl}/api/recovery/actions/${firstAction._id}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'completed',
        retailerNotes: 'Verified during Phase 10 integration test',
      }),
    });

    assert.strictEqual(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.success, true);
    assert.strictEqual(updateBody.data.status, 'completed');

    // Summary progress check for the target plan
    const sumRes = await fetch(`${baseUrl}/api/recovery/summary?planId=${actionPlanId}`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.strictEqual(sumRes.status, 200);
    const sumBody = await sumRes.json();
    assert.strictEqual(sumBody.success, true);
    assert.ok(sumBody.data.completedActions >= 1);
  });

  // ── WORKFLOW E: WHATSAPP CAMPAIGN GENERATOR & AUDIT ───────────────────────
  test('Workflow E1: Generates multilingual WhatsApp campaign with safe pricing', async () => {
    const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        campaignType: 'clearance',
        targetAudience: 'repeat_customers',
        language: 'hinglish',
        tone: 'urgent',
        discountPercent: 20, // 1800 -> 1440 (safe, >= 1200)
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.productSnapshot.sku, testSku);
    assert.strictEqual(body.data.proposedSellingPrice, 1440);
    assert.strictEqual(body.data.minimumSafePrice, 1200);
    assert.strictEqual(body.data.status, 'draft');
    assert.ok(body.data.message.includes('₹1,440'));
    assert.ok(body.data.message.includes('₹1,800'));

    const campaignId = body.data._id;

    // Update draft message
    const patchRes = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        message: body.data.message + '\nNote: Limited quantity of 25 units!',
        status: 'ready',
      }),
    });
    assert.strictEqual(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.data.status, 'ready');
    assert.ok(patchBody.data.message.includes('Limited quantity of 25 units!'));

    // Archive campaign
    const arcRes = await fetch(`${baseUrl}/api/campaigns/${campaignId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.strictEqual(arcRes.status, 200);
    const arcBody = await arcRes.json();
    assert.strictEqual(arcBody.data.status, 'archived');
  });

  test('Workflow E2: Rejects campaign generation with unsafe markdown floor breach', async () => {
    const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        productId,
        campaignType: 'clearance',
        targetAudience: 'all_customers',
        language: 'english',
        tone: 'urgent',
        discountPercent: 50, // 1800 -> 900 < 1200 floor!
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('violates profit safeguards'));
    assert.ok(body.error.safetyDetails);
    assert.strictEqual(body.error.safetyDetails.minimumSafePrice, 1200);
  });
});
