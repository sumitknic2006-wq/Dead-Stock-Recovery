/**
 * StockSaathi AI — Product Validators (Phase 5)
 *
 * Server-side validation helpers.
 * All validation runs before controllers touch the database.
 */

import mongoose from 'mongoose';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when value is a finite, non-negative number.
 * Accepts numeric strings for convenience (form data).
 */
function isNonNegativeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/**
 * Returns true when value is a non-negative integer.
 */
function isNonNegativeInteger(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n);
}

/**
 * Returns true when the string is a valid date that can be parsed by Date.
 * Rejects clearly nonsensical values like '0000-00-00'.
 */
function isValidDateString(v) {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

/**
 * Returns true when s is a valid non-empty string.
 */
function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

// ── Validation result builder ─────────────────────────────────────────────────

/**
 * Accumulates field-level validation errors.
 * @returns {{ errors: string[], isValid: boolean }}
 */
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

// ── Core product field validator ──────────────────────────────────────────────

/**
 * Validates fields required when creating a product.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateProductCreate(body) {
  const v = createValidator();

  v.check(isNonEmptyString(body.name), 'name: Product name is required');
  v.check(
    typeof body.name !== 'string' || body.name.trim().length <= 200,
    'name: Product name must be 200 characters or fewer'
  );

  v.check(isNonEmptyString(body.sku), 'sku: SKU is required');
  v.check(
    typeof body.sku !== 'string' || body.sku.trim().length <= 60,
    'sku: SKU must be 60 characters or fewer'
  );

  v.check(isNonEmptyString(body.category), 'category: Category is required');

  v.check(
    body.purchaseCost !== undefined && body.purchaseCost !== '',
    'purchaseCost: Purchase cost is required'
  );
  v.check(
    isNonNegativeNumber(body.purchaseCost),
    'purchaseCost: Purchase cost must be a non-negative number'
  );

  v.check(
    body.sellingPrice !== undefined && body.sellingPrice !== '',
    'sellingPrice: Selling price is required'
  );
  v.check(
    isNonNegativeNumber(body.sellingPrice),
    'sellingPrice: Selling price must be a non-negative number'
  );

  v.check(
    body.quantity !== undefined && body.quantity !== '',
    'quantity: Quantity is required'
  );
  v.check(
    isNonNegativeInteger(Number(body.quantity)),
    'quantity: Quantity must be a non-negative whole number'
  );

  // Optional fields
  if (body.minimumDesiredProfitPerUnit !== undefined && body.minimumDesiredProfitPerUnit !== null && body.minimumDesiredProfitPerUnit !== '') {
    v.check(
      isNonNegativeNumber(body.minimumDesiredProfitPerUnit),
      'minimumDesiredProfitPerUnit: Must be a non-negative number'
    );
  }

  if (body.minimumGrossMarginPercent !== undefined && body.minimumGrossMarginPercent !== null && body.minimumGrossMarginPercent !== '') {
    const mgm = Number(body.minimumGrossMarginPercent);
    v.check(
      Number.isFinite(mgm) && mgm >= 0 && mgm <= 100,
      'minimumGrossMarginPercent: Must be between 0 and 100'
    );
  }

  if (body.dateAdded !== undefined && body.dateAdded !== null && body.dateAdded !== '') {
    v.check(isValidDateString(body.dateAdded), 'dateAdded: Must be a valid date');
  }

  if (body.lastSaleDate !== undefined && body.lastSaleDate !== null && body.lastSaleDate !== '') {
    v.check(isValidDateString(body.lastSaleDate), 'lastSaleDate: Must be a valid date');
  }

  if (body.expiryDate !== undefined && body.expiryDate !== null && body.expiryDate !== '') {
    v.check(isValidDateString(body.expiryDate), 'expiryDate: Must be a valid date');
  }

  if (body.unitsSoldDuringPeriod !== undefined && body.unitsSoldDuringPeriod !== null && body.unitsSoldDuringPeriod !== '') {
    v.check(
      isNonNegativeInteger(Number(body.unitsSoldDuringPeriod)),
      'unitsSoldDuringPeriod: Must be a non-negative whole number'
    );
  }

  if (body.condition !== undefined && body.condition !== null && body.condition !== '') {
    const allowed = ['new', 'open-box', 'refurbished', 'damaged'];
    v.check(
      allowed.includes(body.condition),
      `condition: Must be one of: ${allowed.join(', ')}`
    );
  }

  return { valid: v.isValid(), errors: v.errors };
}

/**
 * Validates fields allowed when updating a product (all optional but must be valid when present).
 * Returns { valid: boolean, errors: string[] }
 */
export function validateProductUpdate(body) {
  const v = createValidator();

  if (body.name !== undefined) {
    v.check(isNonEmptyString(body.name), 'name: Product name cannot be empty');
    v.check(
      typeof body.name !== 'string' || body.name.trim().length <= 200,
      'name: Product name must be 200 characters or fewer'
    );
  }

  if (body.sku !== undefined) {
    v.check(isNonEmptyString(body.sku), 'sku: SKU cannot be empty');
    v.check(
      typeof body.sku !== 'string' || body.sku.trim().length <= 60,
      'sku: SKU must be 60 characters or fewer'
    );
  }

  if (body.category !== undefined) {
    v.check(isNonEmptyString(body.category), 'category: Category cannot be empty');
  }

  if (body.purchaseCost !== undefined) {
    v.check(
      isNonNegativeNumber(body.purchaseCost),
      'purchaseCost: Must be a non-negative number'
    );
  }

  if (body.sellingPrice !== undefined) {
    v.check(
      isNonNegativeNumber(body.sellingPrice),
      'sellingPrice: Must be a non-negative number'
    );
  }

  if (body.quantity !== undefined) {
    v.check(
      isNonNegativeInteger(Number(body.quantity)),
      'quantity: Must be a non-negative whole number'
    );
  }

  if (body.minimumDesiredProfitPerUnit !== undefined && body.minimumDesiredProfitPerUnit !== null && body.minimumDesiredProfitPerUnit !== '') {
    v.check(
      isNonNegativeNumber(body.minimumDesiredProfitPerUnit),
      'minimumDesiredProfitPerUnit: Must be a non-negative number'
    );
  }

  if (body.minimumGrossMarginPercent !== undefined && body.minimumGrossMarginPercent !== null && body.minimumGrossMarginPercent !== '') {
    const mgm = Number(body.minimumGrossMarginPercent);
    v.check(
      Number.isFinite(mgm) && mgm >= 0 && mgm <= 100,
      'minimumGrossMarginPercent: Must be between 0 and 100'
    );
  }

  if (body.dateAdded !== undefined && body.dateAdded !== null && body.dateAdded !== '') {
    v.check(isValidDateString(body.dateAdded), 'dateAdded: Must be a valid date');
  }

  if (body.lastSaleDate !== undefined && body.lastSaleDate !== null && body.lastSaleDate !== '') {
    v.check(isValidDateString(body.lastSaleDate), 'lastSaleDate: Must be a valid date');
  }

  if (body.expiryDate !== undefined && body.expiryDate !== null && body.expiryDate !== '') {
    v.check(isValidDateString(body.expiryDate), 'expiryDate: Must be a valid date');
  }

  if (body.unitsSoldDuringPeriod !== undefined && body.unitsSoldDuringPeriod !== null && body.unitsSoldDuringPeriod !== '') {
    v.check(
      isNonNegativeInteger(Number(body.unitsSoldDuringPeriod)),
      'unitsSoldDuringPeriod: Must be a non-negative whole number'
    );
  }

  if (body.condition !== undefined && body.condition !== null && body.condition !== '') {
    const allowed = ['new', 'open-box', 'refurbished', 'damaged'];
    v.check(
      allowed.includes(body.condition),
      `condition: Must be one of: ${allowed.join(', ')}`
    );
  }

  return { valid: v.isValid(), errors: v.errors };
}

/**
 * Returns true if the given string is a valid MongoDB ObjectId.
 */
export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Required CSV column headers for bulk import.
 * Keys are the expected header strings (case-insensitive match after trim).
 */
export const CSV_REQUIRED_HEADERS = ['name', 'sku', 'category', 'purchasecost', 'sellingprice', 'quantity'];
export const CSV_OPTIONAL_HEADERS = [
  'suppliername', 'dateadded', 'lastsaledate', 'expirydate',
  'condition', 'notes', 'unitssoldduringperiod',
  'minimumdesiredprofitperunit', 'minimumgrossmarginpercent',
];

/**
 * Validates a single CSV row object (all keys lowercased).
 * Returns { valid: boolean, errors: string[] }
 */
export function validateCsvRow(row, rowIndex) {
  const prefix = `Row ${rowIndex + 1}`;
  const v = createValidator();

  v.check(isNonEmptyString(row.name), `${prefix}: name is required`);
  v.check(isNonEmptyString(row.sku), `${prefix}: sku is required`);
  v.check(isNonEmptyString(row.category), `${prefix}: category is required`);
  v.check(isNonNegativeNumber(row.purchasecost), `${prefix}: purchaseCost must be a non-negative number`);
  v.check(isNonNegativeNumber(row.sellingprice), `${prefix}: sellingPrice must be a non-negative number`);
  v.check(isNonNegativeInteger(Number(row.quantity)), `${prefix}: quantity must be a non-negative whole number`);

  if (row.dateadded) v.check(isValidDateString(row.dateadded), `${prefix}: dateAdded must be a valid date`);
  if (row.lastsaledate) v.check(isValidDateString(row.lastsaledate), `${prefix}: lastSaleDate must be a valid date`);
  if (row.expirydate) v.check(isValidDateString(row.expirydate), `${prefix}: expiryDate must be a valid date`);

  if (row.condition && row.condition.trim()) {
    const allowed = ['new', 'open-box', 'refurbished', 'damaged'];
    v.check(allowed.includes(row.condition.trim().toLowerCase()), `${prefix}: condition must be one of: ${allowed.join(', ')}`);
  }

  if (row.unitssoldduringperiod !== undefined && row.unitssoldduringperiod !== '') {
    v.check(isNonNegativeInteger(Number(row.unitssoldduringperiod)), `${prefix}: unitsSoldDuringPeriod must be a non-negative whole number`);
  }

  return { valid: v.isValid(), errors: v.errors };
}
