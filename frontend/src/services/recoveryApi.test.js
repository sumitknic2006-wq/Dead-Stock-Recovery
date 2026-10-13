/**
 * StockSaathi AI — Recovery API Service Tests (Phase 8)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import {
  getActiveRecoveryPlan,
  getRecoverySummary,
  generateRecoveryPlan,
  updateRecoveryActionStatus,
  getRecoveryHealth,
} from './recoveryApi.js';

describe('Recovery API Frontend Client (recoveryApi.js)', () => {
  test('getActiveRecoveryPlan formats query parameters correctly', async () => {
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
          data: { actions: [{ day: 2, status: 'pending' }] },
        }),
      };
    });

    try {
      const res = await getActiveRecoveryPlan({ day: 2, status: 'pending' });
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/recovery/plan'));
      assert.ok(interceptedUrl.includes('day=2'));
      assert.ok(interceptedUrl.includes('status=pending'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getRecoverySummary calls /api/recovery/summary', async () => {
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
          data: { totalActions: 7, progressPercentage: 28.5 },
        }),
      };
    });

    try {
      const res = await getRecoverySummary();
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.totalActions, 7);
      assert.ok(interceptedUrl.includes('/api/recovery/summary'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('generateRecoveryPlan sends POST request with options', async () => {
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
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { planTitle: '7-Day Cash Recovery Action Plan' },
        }),
      };
    });

    try {
      const res = await generateRecoveryPlan({ preserveCompleted: true, forceReset: false });
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/recovery/plan/generate'));
      assert.strictEqual(interceptedMethod, 'POST');
      assert.strictEqual(interceptedBody.preserveCompleted, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('updateRecoveryActionStatus sends PATCH request with action ID and status', async () => {
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
          data: { status: 'completed', notes: 'Done deal' },
        }),
      };
    });

    try {
      const res = await updateRecoveryActionStatus('act-5678', {
        status: 'completed',
        notes: 'Done deal',
      });
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/recovery/actions/act-5678/status'));
      assert.strictEqual(interceptedMethod, 'PATCH');
      assert.strictEqual(interceptedBody.status, 'completed');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getRecoveryHealth calls /api/recovery/health', async () => {
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
          service: 'recovery-planner',
        }),
      };
    });

    try {
      const res = await getRecoveryHealth();
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/recovery/health'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
