/**
 * StockSaathi AI — Campaign API Service Tests (Phase 9)
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import {
  generateCampaign,
  fetchCampaigns,
  fetchCampaignById,
  updateCampaign,
  archiveCampaign,
  getCampaignHealth,
} from './campaignApi.js';

describe('Campaign API Frontend Client (campaignApi.js)', () => {
  test('generateCampaign sends valid POST payload', async () => {
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
          data: { _id: 'camp-123', message: 'Hello' },
        }),
      };
    });

    try {
      const payload = {
        productId: 'prod-456',
        campaignType: 'flash_sale',
        language: 'english',
        tone: 'friendly',
        discountPercent: 15,
      };
      const res = await generateCampaign(payload);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data._id, 'camp-123');
      assert.ok(interceptedUrl.includes('/api/campaigns/generate'));
      assert.strictEqual(interceptedMethod, 'POST');
      assert.strictEqual(interceptedBody.campaignType, 'flash_sale');
      assert.strictEqual(interceptedBody.discountPercent, 15);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetchCampaigns serializes query parameters correctly', async () => {
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
          data: [],
          pagination: { total: 0, page: 1, limit: 10 },
        }),
      };
    });

    try {
      await fetchCampaigns({ page: 2, limit: 5, status: 'draft', language: 'hindi' });
      assert.ok(interceptedUrl.includes('/api/campaigns'));
      assert.ok(interceptedUrl.includes('page=2'));
      assert.ok(interceptedUrl.includes('limit=5'));
      assert.ok(interceptedUrl.includes('status=draft'));
      assert.ok(interceptedUrl.includes('language=hindi'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('fetchCampaignById calls /api/campaigns/:id', async () => {
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
          data: { _id: 'camp-789' },
        }),
      };
    });

    try {
      const res = await fetchCampaignById('camp-789');
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/campaigns/camp-789'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('updateCampaign sends PATCH request', async () => {
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
          data: { _id: 'camp-789', status: 'ready' },
        }),
      };
    });

    try {
      const res = await updateCampaign('camp-789', { status: 'ready' });
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/campaigns/camp-789'));
      assert.strictEqual(interceptedMethod, 'PATCH');
      assert.strictEqual(interceptedBody.status, 'ready');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('archiveCampaign sends POST /api/campaigns/:id/archive', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = null;
    let interceptedMethod = null;

    globalThis.fetch = mock.fn(async (url, options) => {
      interceptedUrl = url;
      interceptedMethod = options.method;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { _id: 'camp-789', status: 'archived' },
        }),
      };
    });

    try {
      const res = await archiveCampaign('camp-789');
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/campaigns/camp-789/archive'));
      assert.strictEqual(interceptedMethod, 'POST');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getCampaignHealth calls /api/campaigns/health', async () => {
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
          service: 'campaign-generator',
        }),
      };
    });

    try {
      const res = await getCampaignHealth();
      assert.strictEqual(res.success, true);
      assert.ok(interceptedUrl.includes('/api/campaigns/health'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
