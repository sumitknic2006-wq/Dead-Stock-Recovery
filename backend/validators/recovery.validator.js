/**
 * StockSaathi AI — Recovery Plan Validators (Phase 8)
 *
 * Input validation for 7-Day Dead Stock Recovery Action Planner:
 * plan generation options, status transitions, and query filters.
 */

import mongoose from 'mongoose';

// ── Validation Helpers ────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id.trim());
}

function isValidIsoDate(str) {
  if (!str) return false;
  const d = new Date(str);
  return !Number.isNaN(d.getTime());
}

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

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
 * Validates request body for POST /api/recovery/plan/generate
 */
export function validateGeneratePlanRequest(body = {}) {
  const v = createValidator();

  if (body.startDate !== undefined && body.startDate !== null && body.startDate !== '') {
    v.check(
      isValidIsoDate(body.startDate),
      'startDate must be a valid date format (e.g. YYYY-MM-DD or ISO 8601)'
    );
  }

  if (body.preserveCompleted !== undefined && body.preserveCompleted !== null) {
    v.check(
      typeof body.preserveCompleted === 'boolean' ||
        body.preserveCompleted === 'true' ||
        body.preserveCompleted === 'false',
      'preserveCompleted must be a boolean'
    );
  }

  if (body.forceReset !== undefined && body.forceReset !== null) {
    v.check(
      typeof body.forceReset === 'boolean' ||
        body.forceReset === 'true' ||
        body.forceReset === 'false',
      'forceReset must be a boolean'
    );
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates request params and body for PATCH /api/recovery/actions/:id/status
 */
export function validateUpdateActionStatusRequest(actionId, body = {}) {
  const v = createValidator();

  v.check(
    isValidObjectId(actionId),
    'Action ID must be a valid 24-character hexadecimal ObjectId string'
  );

  v.check(
    Boolean(body.status),
    'status is required in the request body'
  );

  if (body.status) {
    v.check(
      VALID_STATUSES.includes(body.status),
      `status must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  if (body.notes !== undefined && body.notes !== null) {
    v.check(
      typeof body.notes === 'string',
      'notes must be a string'
    );
    if (typeof body.notes === 'string') {
      v.check(
        body.notes.length <= 1000,
        'notes cannot exceed 1000 characters'
      );
    }
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates query parameters for GET /api/recovery/plan
 */
export function validateGetPlanQuery(query = {}) {
  const v = createValidator();

  if (query.day !== undefined && query.day !== null && query.day !== '') {
    const dayNum = Number(query.day);
    v.check(
      Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 7,
      'day filter must be an integer between 1 and 7'
    );
  }

  if (query.status !== undefined && query.status !== null && query.status !== '') {
    v.check(
      VALID_STATUSES.includes(query.status),
      `status filter must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  if (query.priority !== undefined && query.priority !== null && query.priority !== '') {
    v.check(
      VALID_PRIORITIES.includes(query.priority),
      `priority filter must be one of: ${VALID_PRIORITIES.join(', ')}`
    );
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}
