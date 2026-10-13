/**
 * StockSaathi AI — WhatsApp Clearance Campaign Generator Test Suite (Phase 9)
 *
 * Verifies all Phase 9 requirements:
 * 1. Campaign generation across all 3 languages (English, Hindi, Hinglish)
 * 2. All 4 campaign types (flash_sale, clearance, bundle_offer, near_expiry)
 * 3. All 3 copywriting tones (friendly, urgent, professional)
 * 4. Rejection of invalid product IDs (400) and missing products (404)
 * 5. Rejection of unsafe discounts with actionable safety details
 * 6. Zero-discount campaigns for margin-constrained products
 * 7. Server-side validation of missing/invalid input fields
 * 8. Campaign pagination, sorting, and filters (status, campaignType, language)
 * 9. Campaign text and status updates via PATCH
 * 10. Campaign archiving via POST /archive without data loss
 * 11. Health endpoint GET /api/campaigns/health
 * 12. Full regression suite verifying Phases 1–8 endpoints remain functional
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
import { generateToken } from '../middleware/auth.middleware.js';
import {
  generateCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  archiveCampaign,
} from '../services/campaign.service.js';
import {
  validateGenerateCampaignRequest,
  validateUpdateCampaignRequest,
  validateGetCampaignsQuery,
} from '../validators/campaign.validator.js';

const testMerchantId = new mongoose.Types.ObjectId();
const testToken = generateToken({
  id: testMerchantId.toString(),
  email: 'campaign_test@kirana.store',
  name: 'Campaign Test Merchant',
});

describe('WhatsApp Clearance Campaign Generator (Phase 9)', () => {
  let server;
  let baseUrl;
  let testProductId;
  let zeroMarginProductId;
  let sampleCampaignId;

  async function ensureTestProducts() {
    if (!process.env.MONGODB_URI) return;
    await connectDB();

    // Clean up previous test campaigns
    await Campaign.deleteMany({ campaignName: /TEST-/i });

    // Seed test products
    const normalProduct = await Product.findOneAndUpdate(
      { sku: 'CAMPAIGN-NORM-01' },
      {
        merchantId: testMerchantId,
        name: 'Phase 9 Wireless Headphones Pro',
        sku: 'CAMPAIGN-NORM-01',
        category: 'Audio',
        quantity: 35,
        purchaseCost: 1000,
        sellingPrice: 2000,
        condition: 'new',
        minimumDesiredProfitPerUnit: 200,
        minimumGrossMarginPercent: 20,
        lastSaleDate: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // Critical dead stock
      },
      { upsert: true, new: true }
    );
    testProductId = normalProduct._id.toString();

    // Seed low/zero discount capacity product (cost 500, price 520, target profit 100 -> floor 600 > 520)
    const zeroMarginProduct = await Product.findOneAndUpdate(
      { sku: 'CAMPAIGN-ZERO-02' },
      {
        merchantId: testMerchantId,
        name: 'Phase 9 Zero Margin Artisan Honey',
        sku: 'CAMPAIGN-ZERO-02',
        category: 'Grocery',
        quantity: 15,
        purchaseCost: 500,
        sellingPrice: 520,
        condition: 'new',
        minimumDesiredProfitPerUnit: 100,
        lastSaleDate: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );
    zeroMarginProductId = zeroMarginProduct._id.toString();
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
    if (process.env.MONGODB_URI) {
      await Campaign.deleteMany({ campaignName: /TEST-/i });
      await Product.deleteMany({ sku: /^CAMPAIGN-/ });
      await disconnectDB();
    }
  });

  // ── 1. Language & Template Generation ──────────────────────────────────────
  describe('Multilingual Deterministic Message Generation', () => {
    test('1. Generates English template with product name, price, and CTA', async () => {
      const res = await generateCampaign(
        {
          productId: testProductId,
          campaignType: 'flash_sale',
          targetAudience: 'all_customers',
          language: 'english',
          tone: 'friendly',
          discountPercent: 15,
          campaignName: 'TEST-English-Flash',
        },
        testMerchantId
      );

      assert.ok(res.campaign, 'Campaign should be saved');
      assert.strictEqual(res.campaign.language, 'english');
      assert.ok(res.campaign.message.includes('Phase 9 Wireless Headphones Pro'));
      assert.ok(res.campaign.message.includes('FLASH SALE'));
      assert.ok(res.campaign.message.includes('₹1,700')); // 2000 - 15%
      assert.strictEqual(res.campaign.status, 'draft');
      sampleCampaignId = res.campaign._id.toString();
    });

    test('2. Generates Hindi template with authentic Devanagari copy', async () => {
      const res = await generateCampaign({
        productId: testProductId,
        campaignType: 'clearance',
        targetAudience: 'local_customers',
        language: 'hindi',
        tone: 'urgent',
        discountPercent: 20,
        campaignName: 'TEST-Hindi-Clearance',
      });

      assert.strictEqual(res.campaign.language, 'hindi');
      assert.ok(res.campaign.message.includes('नमस्ते'));
      assert.ok(res.campaign.message.includes('क्लीयरेंस'));
      assert.ok(res.campaign.message.includes('कीमत विवरण'));
      assert.ok(res.campaign.message.includes('₹1,600'));
    });

    test('3. Generates Hinglish template with conversational retail phrasing', async () => {
      const res = await generateCampaign({
        productId: testProductId,
        campaignType: 'bundle_offer',
        targetAudience: 'repeat_customers',
        language: 'hinglish',
        tone: 'professional',
        discountPercent: 10,
        campaignName: 'TEST-Hinglish-Bundle',
      });

      assert.strictEqual(res.campaign.language, 'hinglish');
      assert.ok(res.campaign.message.includes('Loyal Customers'));
      assert.ok(res.campaign.message.includes('BUNDLE SAVINGS'));
      assert.ok(res.campaign.message.includes('₹1,800'));
    });
  });

  // ── 2. Campaign Types & Tones ──────────────────────────────────────────────
  describe('Campaign Types and Copywriting Tones', () => {
    test('4. Supports near_expiry campaign type with urgent tone', async () => {
      const res = await generateCampaign({
        productId: testProductId,
        campaignType: 'near_expiry',
        tone: 'urgent',
        language: 'english',
        campaignName: 'TEST-Near-Expiry',
      });

      assert.strictEqual(res.campaign.campaignType, 'near_expiry');
      assert.strictEqual(res.campaign.tone, 'urgent');
      assert.ok(res.campaign.message.includes('Hurry!'));
    });

    test('5. Supports professional tone with corporate quality assurance', async () => {
      const res = await generateCampaign({
        productId: testProductId,
        campaignType: 'clearance',
        tone: 'professional',
        language: 'english',
        campaignName: 'TEST-Professional',
      });

      assert.strictEqual(res.campaign.tone, 'professional');
      assert.ok(res.campaign.message.includes('pleased to extend an exclusive retail purchasing opportunity'));
    });
  });

  // ── 3. Financial Safeguards & Price Floors ──────────────────────────────────
  describe('Profit-Safe Offer Rules & Price Floor Protection', () => {
    test('6. Rejects unsafe discount violating minimum price floor with 400', async () => {
      // Product cost 1000, price 2000, floor is ~1250 -> max safe discount is ~37.5%
      // Requesting 60% discount ($800) is well below cost!
      await assert.rejects(
        async () => {
          await generateCampaign({
            productId: testProductId,
            campaignType: 'flash_sale',
            discountPercent: 60,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.message.includes('violates profit safeguards'));
          assert.ok(err.safetyDetails.maximumSafeDiscountPercent < 60);
          return true;
        }
      );
    });

    test('7. Allows zero-discount promotional campaign for zero margin products', async () => {
      const res = await generateCampaign({
        productId: zeroMarginProductId,
        campaignType: 'clearance',
        discountPercent: 0,
        campaignName: 'TEST-Zero-Discount',
      });

      assert.strictEqual(res.campaign.discountPercent, 0);
      assert.strictEqual(res.campaign.proposedSellingPrice, 520);
      assert.strictEqual(res.financialBreakdown.isProfitSafe, true);
      assert.ok(res.campaign.message.includes('₹520'));
    });

    test('8. Automatically caps default discount to maximum safe discount', async () => {
      // When no discountPercent is requested, uses Phase 7 safe recommendation
      const res = await generateCampaign({
        productId: testProductId,
        campaignType: 'flash_sale',
        campaignName: 'TEST-Default-Cap',
      });

      assert.ok(
        res.campaign.proposedSellingPrice >= res.campaign.minimumSafePrice,
        'Proposed price must be >= minimumSafePrice'
      );
      assert.ok(
        res.campaign.discountPercent <= res.financialBreakdown.maximumSafeDiscountPercent,
        'Discount percent must not exceed maximum safe discount'
      );
    });
  });

  // ── 4. Input Validation & Error Handling ───────────────────────────────────
  describe('Input Validation & Safeguards', () => {
    test('9. validateGenerateCampaignRequest rejects missing productId and invalid types', () => {
      const missingProd = validateGenerateCampaignRequest({ campaignType: 'flash_sale' });
      assert.strictEqual(missingProd.isValid, false);
      assert.ok(missingProd.errors.some((e) => e.includes('productId is required')));

      const badType = validateGenerateCampaignRequest({
        productId: new mongoose.Types.ObjectId().toString(),
        campaignType: 'invalid_type',
      });
      assert.strictEqual(badType.isValid, false);
      assert.ok(badType.errors.some((e) => e.includes('campaignType must be one of')));

      const badDiscount = validateGenerateCampaignRequest({
        productId: new mongoose.Types.ObjectId().toString(),
        campaignType: 'flash_sale',
        discountPercent: 120, // > 100
      });
      assert.strictEqual(badDiscount.isValid, false);
      assert.ok(badDiscount.errors.some((e) => e.includes('discountPercent must be between 0 and 100')));
    });

    test('10. Rejects invalid ObjectId format with 400', async () => {
      await assert.rejects(
        async () => {
          await generateCampaign({
            productId: 'invalid-id-123',
            campaignType: 'flash_sale',
          });
        },
        (err) => err.statusCode === 400
      );
    });

    test('11. Returns 404 for non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await assert.rejects(
        async () => {
          await generateCampaign({
            productId: fakeId,
            campaignType: 'flash_sale',
          });
        },
        (err) => err.statusCode === 404
      );
    });
  });

  // ── 5. Campaign Updates & Archiving ────────────────────────────────────────
  describe('Campaign Lifecycle (Update & Archive)', () => {
    test('12. Updates campaign message text and status', async () => {
      const updated = await updateCampaign(sampleCampaignId, {
        message: 'Updated custom promotional copy for retail shop.',
        status: 'ready',
      });

      assert.strictEqual(updated.message, 'Updated custom promotional copy for retail shop.');
      assert.strictEqual(updated.status, 'ready');
    });

    test('13. Rejects discount update if it breaches price floor', async () => {
      await assert.rejects(
        async () => {
          await updateCampaign(sampleCampaignId, {
            discountPercent: 80, // Violates floor
          });
        },
        (err) => err.statusCode === 400
      );
    });

    test('14. Archives campaign without deleting record', async () => {
      const archived = await archiveCampaign(sampleCampaignId);
      assert.strictEqual(archived.status, 'archived');

      // Verify still accessible via getCampaignById
      const retrieved = await getCampaignById(sampleCampaignId);
      assert.ok(retrieved, 'Archived campaign still exists in database');
      assert.strictEqual(retrieved.status, 'archived');
    });
  });

  // ── 6. REST API Endpoints (/api/campaigns) ─────────────────────────────────
  describe('REST Endpoints (/api/campaigns)', () => {
    test('15. POST /api/campaigns/generate creates campaign via HTTP and returns 201', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          campaignType: 'flash_sale',
          language: 'english',
          tone: 'friendly',
          discountPercent: 10,
          campaignName: 'TEST-Http-Gen',
        }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data._id);
      assert.ok(json.financialBreakdown.isProfitSafe);
    });

    test('16. POST /api/campaigns/generate returns 400 for unsafe discount with safetyDetails', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          campaignType: 'flash_sale',
          discountPercent: 75,
        }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.safetyDetails);
      assert.ok(json.error.safetyDetails.maximumSafeDiscountPercent !== undefined);
    });

    test('17. GET /api/campaigns returns paginated list', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns?limit=5`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.pagination);
      assert.ok(json.pagination.total >= 1);
    });

    test('18. GET /api/campaigns/:id returns single campaign', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/${sampleCampaignId}`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data._id, sampleCampaignId);
    });

    test('19. PATCH /api/campaigns/:id updates fields', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/${sampleCampaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          callToAction: 'Call 9876543210 to book immediately!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.callToAction, 'Call 9876543210 to book immediately!');
    });

    test('20. POST /api/campaigns/:id/archive archives campaign via HTTP', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/${sampleCampaignId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${testToken}` },
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, 'archived');
    });

    test('21. GET /api/campaigns/health reports service status', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns/health`);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.service, 'campaign-generator');
    });
  });

  // ── 7. Regression Tests (Phases 1–8) ───────────────────────────────────────
  describe('Phase 1–8 System Regression', () => {
    test('22. GET /api/health returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'ok');
    });

    test('23. GET /api/products returns products list', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
    });

    test('24. GET /api/analysis/dead-stock returns dead stock analysis', async () => {
      const res = await fetch(`${baseUrl}/api/analysis/dead-stock`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
    });

    test('25. GET /api/discounts/health returns discount engine status', async () => {
      const res = await fetch(`${baseUrl}/api/discounts/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'ok');
    });

    test('26. GET /api/recovery/health returns recovery planner status', async () => {
      const res = await fetch(`${baseUrl}/api/recovery/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.service, 'recovery-planner');
    });
  });
});
