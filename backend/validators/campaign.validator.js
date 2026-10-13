/**
 * StockSaathi AI — Campaign Validators (Phase 9)
 *
 * Input validation for WhatsApp Clearance Campaign generation,
 * edits, query filters, and status transitions.
 */

import mongoose from 'mongoose';

// ── Validation Helpers ────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id.trim());
}

function isFiniteNumber(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n);
}

const VALID_CAMPAIGN_TYPES = ['flash_sale', 'clearance', 'bundle_offer', 'near_expiry'];
const VALID_AUDIENCES = ['all_customers', 'repeat_customers', 'local_customers', 'custom'];
const VALID_LANGUAGES = ['english', 'hindi', 'hinglish'];
const VALID_TONES = ['friendly', 'urgent', 'professional'];
const VALID_STATUSES = ['draft', 'ready', 'archived'];

function createValidator() {
  const errors = [];
  return {
    errors,
    check(condition, message) {
      if (!condition) errors.push(message);
    },
    isValid() {
      return errors.length === 0;
    },
  };
}

// ── Validation Suites ─────────────────────────────────────────────────────────

/**
 * Validates request body for POST /api/campaigns/generate
 */
export function validateGenerateCampaignRequest(body = {}) {
  const v = createValidator();

  // 1. Product ID
  v.check(
    Boolean(body.productId),
    'productId is required'
  );
  if (body.productId) {
    v.check(
      isValidObjectId(body.productId),
      'productId must be a valid 24-character hexadecimal ObjectId string'
    );
  }

  // 2. Campaign Type
  v.check(
    Boolean(body.campaignType),
    'campaignType is required'
  );
  if (body.campaignType) {
    v.check(
      VALID_CAMPAIGN_TYPES.includes(body.campaignType),
      `campaignType must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}`
    );
  }

  // 3. Target Audience (optional)
  if (body.targetAudience !== undefined && body.targetAudience !== null && body.targetAudience !== '') {
    v.check(
      VALID_AUDIENCES.includes(body.targetAudience),
      `targetAudience must be one of: ${VALID_AUDIENCES.join(', ')}`
    );
  }

  // 4. Language (optional)
  if (body.language !== undefined && body.language !== null && body.language !== '') {
    v.check(
      VALID_LANGUAGES.includes(body.language),
      `language must be one of: ${VALID_LANGUAGES.join(', ')}`
    );
  }

  // 5. Tone (optional)
  if (body.tone !== undefined && body.tone !== null && body.tone !== '') {
    v.check(
      VALID_TONES.includes(body.tone),
      `tone must be one of: ${VALID_TONES.join(', ')}`
    );
  }

  // 6. Discount percent (optional)
  if (body.discountPercent !== undefined && body.discountPercent !== null && body.discountPercent !== '') {
    v.check(
      isFiniteNumber(body.discountPercent),
      'discountPercent must be a finite number between 0 and 100'
    );
    if (isFiniteNumber(body.discountPercent)) {
      const d = Number(body.discountPercent);
      v.check(
        d >= 0 && d <= 100,
        'discountPercent must be between 0 and 100'
      );
    }
  }

  // 7. Custom instructions (optional)
  if (body.customInstructions !== undefined && body.customInstructions !== null) {
    v.check(
      typeof body.customInstructions === 'string',
      'customInstructions must be a string'
    );
    if (typeof body.customInstructions === 'string') {
      v.check(
        body.customInstructions.length <= 500,
        'customInstructions cannot exceed 500 characters'
      );
    }
  }

  // 8. Campaign Name (optional)
  if (body.campaignName !== undefined && body.campaignName !== null) {
    v.check(
      typeof body.campaignName === 'string',
      'campaignName must be a string'
    );
    if (typeof body.campaignName === 'string') {
      v.check(
        body.campaignName.trim().length <= 200,
        'campaignName cannot exceed 200 characters'
      );
    }
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates request body for PATCH /api/campaigns/:id
 */
export function validateUpdateCampaignRequest(body = {}) {
  const v = createValidator();

  if (body.message !== undefined && body.message !== null) {
    v.check(
      typeof body.message === 'string' && body.message.trim().length > 0,
      'message cannot be empty'
    );
    if (typeof body.message === 'string') {
      v.check(
        body.message.length <= 2500,
        'message cannot exceed 2500 characters'
      );
    }
  }

  if (body.callToAction !== undefined && body.callToAction !== null) {
    v.check(
      typeof body.callToAction === 'string',
      'callToAction must be a string'
    );
    if (typeof body.callToAction === 'string') {
      v.check(
        body.callToAction.length <= 300,
        'callToAction cannot exceed 300 characters'
      );
    }
  }

  if (body.targetAudience !== undefined && body.targetAudience !== null) {
    v.check(
      VALID_AUDIENCES.includes(body.targetAudience),
      `targetAudience must be one of: ${VALID_AUDIENCES.join(', ')}`
    );
  }

  if (body.tone !== undefined && body.tone !== null) {
    v.check(
      VALID_TONES.includes(body.tone),
      `tone must be one of: ${VALID_TONES.join(', ')}`
    );
  }

  if (body.status !== undefined && body.status !== null) {
    v.check(
      VALID_STATUSES.includes(body.status),
      `status must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  if (body.discountPercent !== undefined && body.discountPercent !== null && body.discountPercent !== '') {
    v.check(
      isFiniteNumber(body.discountPercent),
      'discountPercent must be a finite number between 0 and 100'
    );
    if (isFiniteNumber(body.discountPercent)) {
      const d = Number(body.discountPercent);
      v.check(
        d >= 0 && d <= 100,
        'discountPercent must be between 0 and 100'
      );
    }
  }

  if (body.campaignName !== undefined && body.campaignName !== null) {
    v.check(
      typeof body.campaignName === 'string' && body.campaignName.trim().length > 0,
      'campaignName cannot be empty'
    );
    if (typeof body.campaignName === 'string') {
      v.check(
        body.campaignName.trim().length <= 200,
        'campaignName cannot exceed 200 characters'
      );
    }
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates query parameters for GET /api/campaigns
 */
export function validateGetCampaignsQuery(query = {}) {
  const v = createValidator();

  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const p = Number(query.page);
    v.check(
      Number.isInteger(p) && p >= 1,
      'page must be an integer >= 1'
    );
  }

  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const l = Number(query.limit);
    v.check(
      Number.isInteger(l) && l >= 1 && l <= 100,
      'limit must be an integer between 1 and 100'
    );
  }

  if (query.status !== undefined && query.status !== null && query.status !== '') {
    v.check(
      VALID_STATUSES.includes(query.status),
      `status filter must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  if (query.campaignType !== undefined && query.campaignType !== null && query.campaignType !== '') {
    v.check(
      VALID_CAMPAIGN_TYPES.includes(query.campaignType),
      `campaignType filter must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}`
    );
  }

  if (query.language !== undefined && query.language !== null && query.language !== '') {
    v.check(
      VALID_LANGUAGES.includes(query.language),
      `language filter must be one of: ${VALID_LANGUAGES.join(', ')}`
    );
  }

  if (query.productId !== undefined && query.productId !== null && query.productId !== '') {
    v.check(
      isValidObjectId(query.productId),
      'productId filter must be a valid 24-character hexadecimal ObjectId string'
    );
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}
