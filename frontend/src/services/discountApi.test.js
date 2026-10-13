/**
 * StockSaathi AI — Discount API Service Tests (Phase 7)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import {
  calculateProposedDiscount,
  calculateMinimumSafePrice,
  fetchDiscountRecommendation,
  getDiscountEngineHealth,
} from './discountApi.js';

describe('Discount API Frontend Client (discountApi.js)', () => {
  test('calculateProposedDiscount sends valid POST payload', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = null;
    let interceptedMethod = null;
    let interceptedBody = null;

    globalThis.fetch = mock.fn(async (url, options) => {
      interceptedUrl = url;
      interceptedMethod = options.method;
      interceptedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { proposedSellingPrice: 800, isSafe: true },
        }),
      };
    });

    try {
      const payload = {
        purchaseCost: 500,
        sellingPrice: 1000,
        discountPercent: 20,
        constraintType: 'minimum_margin',
        minimumGrossMarginPercent: 15,
      };
      const res = await calculateProposedDiscount(payload);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.proposedSellingPrice, 800);
      assert.ok(interceptedUrl.includes('/api/discounts/calculate'));
      assert.strictEqual(interceptedMethod, 'POST');
      assert.strictEqual(interceptedBody.discountPercent, 20);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('calculateMinimumSafePrice formats POST request correctly', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = null;

    globalThis.fetch = mock.fn(async (url) => {
      interceptedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { minimumAcceptablePrice: 750, maximumSafeDiscountPercent: 25 },
        }),
      };
    });

    try {
      const res = await calculateMinimumSafePrice({
        purchaseCost: 600,
        constraintType: 'minimum_margin',
        minimumGrossMarginPercent: 20,
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.minimumAcceptablePrice, 750);
      assert.ok(interceptedUrl.includes('/api/discounts/minimum-price'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetchDiscountRecommendation passes productId in POST body', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedBody = null;

    globalThis.fetch = mock.fn(async (url, options) => {
      interceptedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            recommendation: {
              recommendedDiscountPercent: 15,
              isSafe: true,
            },
          },
        }),
      };
    });

    try {
      const res = await fetchDiscountRecommendation({ productId: 'prod-123' });
      assert.strictEqual(res.success, true);
      assert.strictEqual(interceptedBody.productId, 'prod-123');
      assert.strictEqual(res.data.recommendation.recommendedDiscountPercent, 15);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getDiscountEngineHealth calls /api/discounts/health', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = null;

    globalThis.fetch = mock.fn(async (url) => {
      interceptedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          engine: 'profit-safe-discount-optimization',
          status: 'ok',
        }),
      };
    });

    try {
      const res = await getDiscountEngineHealth();
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/discounts/health'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
