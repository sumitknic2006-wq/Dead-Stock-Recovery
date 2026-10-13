/**
 * StockSaathi AI — Discount Validators (Phase 7)
 *
 * Input validation for profit-safe dynamic discount calculations,
 * minimum price floors, and product-specific discount recommendations.
 */

import mongoose from 'mongoose';

// ── Validation Helpers ────────────────────────────────────────────────────────

function isFiniteNumber(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n);
}

function isNonNegativeNumber(v) {
  if (!isFiniteNumber(v)) return false;
  return Number(v) >= 0;
}

function isPositiveInteger(v) {
  if (!isFiniteNumber(v)) return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1;
}

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id.trim());
}

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
 * Validates request body for POST /api/discounts/calculate
 */
export function validateCalculateDiscountRequest(body = {}) {
  const v = createValidator();

  // 1. Product reference or direct cost inputs
  const hasProductId = Boolean(body.productId);
  if (hasProductId) {
    v.check(
      isValidObjectId(body.productId),
      'productId must be a valid 24-character hexadecimal ObjectId string'
    );
  } else {
    v.check(
      isNonNegativeNumber(body.purchaseCost),
      'purchaseCost is required and must be a non-negative finite number when productId is not provided'
    );
    v.check(
      isNonNegativeNumber(body.sellingPrice),
      'sellingPrice is required and must be a non-negative finite number when productId is not provided'
    );
  }

  // 2. Variable cost (optional)
  if (body.variableCostPerUnit !== undefined && body.variableCostPerUnit !== null && body.variableCostPerUnit !== '') {
    v.check(
      isNonNegativeNumber(body.variableCostPerUnit),
      'variableCostPerUnit must be a non-negative finite number'
    );
  }

  // 3. Quantity (optional)
  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== '') {
    v.check(
      isPositiveInteger(body.quantity),
      'quantity must be a positive integer (at least 1)'
    );
  }

  // 4. Constraint type
  v.check(
    body.constraintType === 'minimum_profit' || body.constraintType === 'minimum_margin',
    'constraintType is required and must be either "minimum_profit" or "minimum_margin"'
  );

  // 5. Target constraints
  if (body.constraintType === 'minimum_profit') {
    v.check(
      isNonNegativeNumber(body.minimumDesiredProfitPerUnit),
      'minimumDesiredProfitPerUnit is required and must be a non-negative finite number for constraintType "minimum_profit"'
    );
  } else if (body.constraintType === 'minimum_margin') {
    v.check(
      isNonNegativeNumber(body.minimumGrossMarginPercent),
      'minimumGrossMarginPercent is required and must be a non-negative finite number for constraintType "minimum_margin"'
    );
    if (isFiniteNumber(body.minimumGrossMarginPercent)) {
      const margin = Number(body.minimumGrossMarginPercent);
      v.check(
        margin < 100,
        'minimumGrossMarginPercent cannot be 100% or greater (a 100% margin requires zero or negative cost of goods)'
      );
    }
  }

  // 6. Discount proposal: discountPercent, proposedSellingPrice, or both
  const hasDiscountPercent = isFiniteNumber(body.discountPercent);
  const hasProposedPrice = isFiniteNumber(body.proposedSellingPrice);

  v.check(
    hasDiscountPercent || hasProposedPrice,
    'Either discountPercent or proposedSellingPrice must be provided'
  );

  if (hasDiscountPercent) {
    const d = Number(body.discountPercent);
    v.check(
      d >= 0 && d <= 100,
      'discountPercent must be a finite number between 0 and 100'
    );
  }

  if (hasProposedPrice) {
    const p = Number(body.proposedSellingPrice);
    v.check(
      p >= 0,
      'proposedSellingPrice must be a non-negative finite number'
    );
  }

  // If both provided and sellingPrice is known directly, check for conflict
  if (hasDiscountPercent && hasProposedPrice && !hasProductId && isNonNegativeNumber(body.sellingPrice)) {
    const listPrice = Number(body.sellingPrice);
    const d = Number(body.discountPercent);
    const proposed = Number(body.proposedSellingPrice);
    const calculatedProposed = listPrice * (1 - d / 100);
    const diff = Math.abs(calculatedProposed - proposed);
    // Allow up to ₹1.00 or 1% rounding difference
    v.check(
      diff <= 1.01 || (listPrice > 0 && Math.abs(diff / listPrice) <= 0.02),
      `Conflicting discount inputs: proposedSellingPrice (₹${proposed}) does not match discountPercent (${d}% of ₹${listPrice} = ₹${calculatedProposed.toFixed(2)})`
    );
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates request body for POST /api/discounts/minimum-price
 */
export function validateMinimumPriceRequest(body = {}) {
  const v = createValidator();

  const hasProductId = Boolean(body.productId);
  if (hasProductId) {
    v.check(
      isValidObjectId(body.productId),
      'productId must be a valid 24-character hexadecimal ObjectId string'
    );
  } else {
    v.check(
      isNonNegativeNumber(body.purchaseCost),
      'purchaseCost is required and must be a non-negative finite number when productId is not provided'
    );
    v.check(
      isNonNegativeNumber(body.sellingPrice),
      'sellingPrice is required and must be a non-negative finite number when productId is not provided'
    );
  }

  if (body.variableCostPerUnit !== undefined && body.variableCostPerUnit !== null && body.variableCostPerUnit !== '') {
    v.check(
      isNonNegativeNumber(body.variableCostPerUnit),
      'variableCostPerUnit must be a non-negative finite number'
    );
  }

  v.check(
    body.constraintType === 'minimum_profit' || body.constraintType === 'minimum_margin',
    'constraintType is required and must be either "minimum_profit" or "minimum_margin"'
  );

  if (body.constraintType === 'minimum_profit') {
    v.check(
      isNonNegativeNumber(body.minimumDesiredProfitPerUnit),
      'minimumDesiredProfitPerUnit is required and must be a non-negative finite number for constraintType "minimum_profit"'
    );
  } else if (body.constraintType === 'minimum_margin') {
    v.check(
      isNonNegativeNumber(body.minimumGrossMarginPercent),
      'minimumGrossMarginPercent is required and must be a non-negative finite number for constraintType "minimum_margin"'
    );
    if (isFiniteNumber(body.minimumGrossMarginPercent)) {
      const margin = Number(body.minimumGrossMarginPercent);
      v.check(
        margin < 100,
        'minimumGrossMarginPercent cannot be 100% or greater'
      );
    }
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

/**
 * Validates request body for POST /api/discounts/recommend
 */
export function validateRecommendDiscountRequest(body = {}) {
  const v = createValidator();

  v.check(
    isValidObjectId(body.productId),
    'productId is required and must be a valid 24-character hexadecimal ObjectId string'
  );

  if (body.variableCostPerUnit !== undefined && body.variableCostPerUnit !== null && body.variableCostPerUnit !== '') {
    v.check(
      isNonNegativeNumber(body.variableCostPerUnit),
      'variableCostPerUnit must be a non-negative finite number'
    );
  }

  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== '') {
    v.check(
      isPositiveInteger(body.quantity),
      'quantity must be a positive integer (at least 1)'
    );
  }

  if (body.constraintType !== undefined && body.constraintType !== null && body.constraintType !== '') {
    v.check(
      body.constraintType === 'minimum_profit' || body.constraintType === 'minimum_margin',
      'constraintType, if provided, must be either "minimum_profit" or "minimum_margin"'
    );

    if (body.constraintType === 'minimum_profit' && body.minimumDesiredProfitPerUnit !== undefined) {
      v.check(
        isNonNegativeNumber(body.minimumDesiredProfitPerUnit),
        'minimumDesiredProfitPerUnit must be a non-negative finite number'
      );
    }

    if (body.constraintType === 'minimum_margin' && body.minimumGrossMarginPercent !== undefined) {
      v.check(
        isNonNegativeNumber(body.minimumGrossMarginPercent),
        'minimumGrossMarginPercent must be a non-negative finite number'
      );
      if (isFiniteNumber(body.minimumGrossMarginPercent)) {
        v.check(
          Number(body.minimumGrossMarginPercent) < 100,
          'minimumGrossMarginPercent cannot be 100% or greater'
        );
      }
    }
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}
