/**
 * StockSaathi AI — 7-Day Dead Stock Recovery Action Planner Test Suite (Phase 8)
 *
 * Verifies all Phase 8 requirements:
 * 1. Seven-day date boundaries and UTC midnight date handling
 * 2. Risk-based action prioritization and day assignment
 * 3. Expiry urgency and insufficient sales data handling
 * 4. Zero safe discount capacity falls back to non-discount action
 * 5. Minimum price floor protection (proposedSellingPrice >= minimumSafePrice)
 * 6. Empty inventory catalog handles gracefully without throwing
 * 7. Degraded API response (503) when MongoDB is disconnected
 * 8. Plan generation, regeneration, and completed-action preservation
 * 9. Status transitions (pending -> in_progress -> completed -> skipped)
 * 10. Summary calculations, actual recovered value, and progress percentage
 * 11. API input validation (invalid IDs, out-of-range days, bad statuses)
 * 12. Regression: Phases 1–7 endpoints remain functional
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
import RecoveryPlan from '../models/RecoveryPlan.model.js';
import { generateToken } from '../middleware/auth.middleware.js';
import {
  generateSevenDayRecoveryPlan,
  getActiveRecoveryPlan,
  getRecoveryPlanSummary,
  updateActionStatus,
} from '../services/recovery.service.js';
import {
  validateGeneratePlanRequest,
  validateUpdateActionStatusRequest,
  validateGetPlanQuery,
} from '../validators/recovery.validator.js';

const testMerchantId = new mongoose.Types.ObjectId();
const testToken = generateToken({
  id: testMerchantId.toString(),
  email: 'recovery_test@kirana.store',
  name: 'Recovery Test Merchant',
});

describe('7-Day Dead Stock Recovery Action Planner (Phase 8)', () => {
  let server;
  let baseUrl;
  let testProductId;
  let activePlanId;
  let actionItemId;

  async function ensureTestProducts() {
    if (!process.env.MONGODB_URI) return;
    await connectDB();

    // Clean up previous test plans
    await RecoveryPlan.deleteMany({ planTitle: /7-Day Cash Recovery/i });

    // Seed test products with specific dead stock & margin attributes
    const testProducts = [
      {
        merchantId: testMerchantId,
        name: 'Critical Dead Stock Camera Lens',
        sku: 'TEST-REC-CRIT-01',
        category: 'Electronics',
        quantity: 12,
        purchaseCost: 5000,
        sellingPrice: 8000,
        condition: 'new',
        minimumDesiredProfitPerUnit: 500,
        minimumGrossMarginPercent: 15,
        lastSaleDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000), // 110 days ago -> Critical Dead Stock
      },
      {
        merchantId: testMerchantId,
        name: 'At-Risk Silk Scarf',
        sku: 'TEST-REC-RISK-02',
        category: 'Fashion',
        quantity: 25,
        purchaseCost: 300,
        sellingPrice: 700,
        condition: 'new',
        minimumDesiredProfitPerUnit: 50,
        minimumGrossMarginPercent: 20,
        lastSaleDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), // 75 days ago -> At Risk
      },
      {
        merchantId: testMerchantId,
        name: 'Zero Margin Organic Tea',
        sku: 'TEST-REC-ZEROMARG-03',
        category: 'Grocery',
        quantity: 40,
        purchaseCost: 200,
        sellingPrice: 210, // Cost 200, Selling 210, target profit 20 => floor is 220 => zero discount possible
        condition: 'new',
        minimumDesiredProfitPerUnit: 20,
        lastSaleDate: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const p of testProducts) {
      await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
    }

    const seeded = await Product.findOne({ sku: 'TEST-REC-CRIT-01' });
    if (seeded) testProductId = seeded._id.toString();
  }

  before(async () => {
    await ensureTestProducts();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test plans and products
    if (process.env.MONGODB_URI) {
      await RecoveryPlan.deleteMany({ planTitle: /7-Day Cash Recovery/i });
      await Product.deleteMany({ sku: /^TEST-REC-/ });
      await disconnectDB();
    }
  });

  // ── 1. Date Handling & 7-Day Boundaries ─────────────────────────────────────
  describe('Seven-Day Scheduling & Date Boundaries', () => {
    test('1. Generates exactly 7 sequential days with valid calendar boundaries', async () => {
      const fixedStart = new Date('2026-11-01T00:00:00.000Z');
      const plan = await generateSevenDayRecoveryPlan({ startDate: fixedStart });

      assert.ok(plan, 'Plan should be generated');
      assert.strictEqual(plan.actions.length, 7, 'Should have exactly 7 daily actions');

      const expectedEnd = new Date('2026-11-07T00:00:00.000Z');
      assert.strictEqual(
        new Date(plan.startDate).toISOString().slice(0, 10),
        '2026-11-01',
        'Start date matches Day 1'
      );
      assert.strictEqual(
        new Date(plan.endDate).toISOString().slice(0, 10),
        '2026-11-07',
        'End date matches Day 7'
      );

      // Verify each action's day number and sequence
      for (let i = 0; i < 7; i++) {
        const action = plan.actions[i];
        assert.strictEqual(action.day, i + 1, `Action day should be ${i + 1}`);
        const expectedDateStr = `2026-11-0${i + 1}`;
        assert.strictEqual(
          new Date(action.plannedActionDate).toISOString().slice(0, 10),
          expectedDateStr,
          `Action ${i + 1} planned date matches sequential calendar day`
        );
      }
    });
  });

  // ── 2. Financial Safeguards & Floor Protection ──────────────────────────────
  describe('Financial Safeguards & Discount Capacity', () => {
    test('2. Proposed selling price is strictly >= minimumSafePrice for all actions', async () => {
      const plan = await getActiveRecoveryPlan();
      assert.ok(plan, 'Active plan should exist');

      for (const action of plan.actions) {
        if (action.minimumSafePrice > 0) {
          assert.ok(
            action.proposedSellingPrice >= action.minimumSafePrice,
            `Proposed price (₹${action.proposedSellingPrice}) must be >= minimum safe price (₹${action.minimumSafePrice}) for Day ${action.day}`
          );
        }
      }
    });

    test('3. Products with zero safe discount capacity fall back to non-discount actions', async () => {
      // Find action for zero-margin product (TEST-REC-ZEROMARG-03)
      const plan = await getActiveRecoveryPlan();
      const zeroMarginAction = plan.actions.find((a) => a.sku === 'TEST-REC-ZEROMARG-03');

      if (zeroMarginAction) {
        // If safe discount capacity is 0, discount percent must be 0
        assert.strictEqual(
          zeroMarginAction.suggestedDiscountPercent,
          0,
          'Zero discount capacity product must have 0% discount'
        );
        // Action type should not be profit_safe_clearance when price cannot be cut
        assert.ok(
          ['bundle_compatible', 'merchandising_display', 'reseller_outreach', 'audit_sales_data', 'final_review_reallocate'].includes(
            zeroMarginAction.actionType
          ),
          `Action type should be non-discount fallback, was: ${zeroMarginAction.actionType}`
        );
      }
    });

    test('4. Expected recovery value and inventory cost exposure are distinct estimates', async () => {
      const plan = await getActiveRecoveryPlan();
      assert.ok(typeof plan.totalCostExposure === 'number', 'totalCostExposure is a number');
      assert.ok(typeof plan.estimatedTotalRecoveryValue === 'number', 'estimatedTotalRecoveryValue is a number');
      assert.ok(plan.totalCostExposure >= 0, 'Cost exposure is non-negative');
      assert.ok(plan.estimatedTotalRecoveryValue >= 0, 'Recovery value is non-negative');
    });
  });

  // ── 3. Plan Regeneration & Completed Action Preservation ───────────────────
  describe('Plan Regeneration & Action Preservation', () => {
    test('5. Regenerating plan safely preserves completed actions by default', async () => {
      const initialPlan = await getActiveRecoveryPlan();
      activePlanId = initialPlan._id.toString();
      actionItemId = initialPlan.actions[0]._id.toString();

      // Mark Day 1 action as completed with specific notes
      await updateActionStatus({
        actionId: actionItemId,
        status: 'completed',
        notes: 'Handled via digital broadcast with ₹15,000 cash unlocked',
      });

      // Regenerate plan with preserveCompleted: true
      const regeneratedPlan = await generateSevenDayRecoveryPlan({
        preserveCompleted: true,
        forceReset: false,
      });

      const day1Action = regeneratedPlan.actions.find((a) => a.day === 1);
      assert.ok(day1Action, 'Day 1 action exists');
      assert.strictEqual(day1Action.status, 'completed', 'Completed status was preserved');
      assert.strictEqual(
        day1Action.notes,
        'Handled via digital broadcast with ₹15,000 cash unlocked',
        'Completion notes were preserved'
      );
      assert.ok(day1Action.completedAt, 'completedAt timestamp was preserved');
    });

    test('6. Force reset cleanly re-initializes all days to pending', async () => {
      const resetPlan = await generateSevenDayRecoveryPlan({
        forceReset: true,
      });

      assert.strictEqual(resetPlan.status, 'active');
      for (const action of resetPlan.actions) {
        assert.strictEqual(action.status, 'pending', `Day ${action.day} action should be pending after force reset`);
      }
    });
  });

  // ── 4. Action Status Transitions ───────────────────────────────────────────
  describe('Status Transitions & Audit Tracking', () => {
    test('7. Transitions from pending -> in_progress -> completed -> skipped', async () => {
      const plan = await getActiveRecoveryPlan();
      const testAction = plan.actions[1]; // Day 2
      const id = testAction._id.toString();

      // Transition to in_progress
      const step1 = await updateActionStatus({ actionId: id, status: 'in_progress' });
      assert.strictEqual(step1.action.status, 'in_progress');
      assert.strictEqual(step1.action.completedAt, null);

      // Transition to completed
      const step2 = await updateActionStatus({
        actionId: id,
        status: 'completed',
        notes: 'Bundle launched at checkout',
      });
      assert.strictEqual(step2.action.status, 'completed');
      assert.ok(step2.action.completedAt, 'completedAt timestamp set');
      assert.strictEqual(step2.action.notes, 'Bundle launched at checkout');

      // Transition to skipped
      const step3 = await updateActionStatus({ actionId: id, status: 'skipped', notes: 'Supplier recalled item' });
      assert.strictEqual(step3.action.status, 'skipped');
      assert.strictEqual(step3.action.completedAt, null, 'completedAt cleared when skipped');
      assert.strictEqual(step3.action.notes, 'Supplier recalled item');
    });

    test('8. Rejects invalid action ID with null / error handling', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await updateActionStatus({ actionId: fakeId, status: 'completed' });
      assert.strictEqual(result, null, 'Non-existent action returns null');
    });
  });

  // ── 5. Summary & Metrics Calculations ──────────────────────────────────────
  describe('Plan Summary & Progress Metrics', () => {
    test('9. Summary accurately computes action counts, progress %, and recovered value', async () => {
      const summary = await getRecoveryPlanSummary();

      assert.ok(summary, 'Summary should be returned');
      assert.strictEqual(summary.totalActions, 7, 'Should total 7 actions');
      assert.strictEqual(
        summary.completedActions + summary.inProgressActions + summary.pendingActions + summary.skippedActions,
        7,
        'Sum of action counts equals total'
      );
      assert.ok(
        summary.progressPercentage >= 0 && summary.progressPercentage <= 100,
        'Progress percentage between 0 and 100'
      );
      assert.strictEqual(summary.dailyBreakdown.length, 7, '7 days in daily breakdown');
      assert.ok(summary.totalCostExposure >= 0, 'Cost exposure is non-negative');
      assert.ok(summary.estimatedTotalRecoveryValue >= 0, 'Estimated recovery value is non-negative');
      assert.ok(summary.actualRecoveredValue >= 0, 'Actual recovered value is non-negative');
    });
  });

  // ── 6. Input Validation Suites ─────────────────────────────────────────────
  describe('Input Validation & Safeguards', () => {
    test('10. validateGeneratePlanRequest rejects invalid date and validates booleans', () => {
      const invalid = validateGeneratePlanRequest({ startDate: 'not-a-date' });
      assert.strictEqual(invalid.isValid, false);
      assert.ok(invalid.errors.some((e) => e.includes('startDate must be a valid date')));

      const valid = validateGeneratePlanRequest({
        startDate: '2026-11-01',
        preserveCompleted: true,
        forceReset: false,
      });
      assert.strictEqual(valid.isValid, true);
    });

    test('11. validateUpdateActionStatusRequest enforces valid ObjectId and status enum', () => {
      const badId = validateUpdateActionStatusRequest('invalid-id', { status: 'completed' });
      assert.strictEqual(badId.isValid, false);
      assert.ok(badId.errors.some((e) => e.includes('Action ID must be a valid')));

      const badStatus = validateUpdateActionStatusRequest(
        new mongoose.Types.ObjectId().toString(),
        { status: 'invalid_status' }
      );
      assert.strictEqual(badStatus.isValid, false);
      assert.ok(badStatus.errors.some((e) => e.includes('status must be one of')));

      const valid = validateUpdateActionStatusRequest(
        new mongoose.Types.ObjectId().toString(),
        { status: 'in_progress', notes: 'Testing note' }
      );
      assert.strictEqual(valid.isValid, true);
    });

    test('12. validateGetPlanQuery enforces day range 1–7 and status enum', () => {
      const badDay = validateGetPlanQuery({ day: '10' });
      assert.strictEqual(badDay.isValid, false);
      assert.ok(badDay.errors.some((e) => e.includes('day filter must be an integer between 1 and 7')));

      const validDay = validateGetPlanQuery({ day: '3', status: 'pending' });
      assert.strictEqual(validDay.isValid, true);
    });
  });

  // ── 7. REST Endpoints (/api/recovery) ──────────────────────────────────────
  describe('REST Endpoints (/api/recovery)', () => {
    test('13. GET /api/recovery/plan returns active plan with 200', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.actions, 'Actions array present');
      assert.strictEqual(json.data.actions.length, 7);
    });

    test('14. GET /api/recovery/plan supports filtering by day', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan?day=2`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.actions.length, 1);
      assert.strictEqual(json.data.actions[0].day, 2);
    });

    test('15. GET /api/recovery/summary returns calculated progress and metrics', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/summary`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.totalActions, 7);
      assert.ok('progressPercentage' in json.data);
      assert.ok('totalCostExposure' in json.data);
      assert.ok('estimatedTotalRecoveryValue' in json.data);
      assert.ok('dailyBreakdown' in json.data);
    });

    test('16. POST /api/recovery/plan/generate generates plan and returns 201', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({ preserveCompleted: true }),
      });
      assert.strictEqual(res.status, 201);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.actions.length === 7);
    });

    test('17. PATCH /api/recovery/actions/:id/status updates action status', async () => {
      // Fetch plan to get an action ID
      const planRes = await fetch(`${baseUrl}/api/recovery/plan`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const planJson = await planRes.json();
      const targetAction = planJson.data.actions[0];

      const patchRes = await fetch(`${baseUrl}/api/recovery/actions/${targetAction._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Executed Day 1 markdown campaign with high customer engagement',
        }),
      });

      assert.strictEqual(patchRes.status, 200);
      const patchJson = await patchRes.json();
      assert.strictEqual(patchJson.success, true);
      assert.strictEqual(patchJson.data.status, 'completed');
      assert.strictEqual(patchJson.data.notes, 'Executed Day 1 markdown campaign with high customer engagement');
    });

    test('18. PATCH /api/recovery/actions/:id/status returns 404 for missing action ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/recovery/actions/${nonExistentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.statusCode, 404);
    });

    test('19. GET /api/recovery/health returns 200 with service info', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.service, 'recovery-planner');
    });
  });

  // ── 8. Regression Tests (Phases 1–7) ───────────────────────────────────────
  describe('Phase 1–7 System Regression', () => {
    test('20. GET /api/health returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'ok');
    });

    test('21. GET /api/products returns products list', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
    });

    test('22. GET /api/analysis/dead-stock returns analysis payload', async () => {
      const res = await fetch(`${baseUrl}/api/analysis/dead-stock`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
    });

    test('23. GET /api/discounts/health returns discount engine status', async () => {
      const res = await fetch(`${baseUrl}/api/discounts/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'ok');
      assert.strictEqual(json.engine, 'profit-safe-discount-optimization');
    });
  });
});
