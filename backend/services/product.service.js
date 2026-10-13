/**
 * StockSaathi AI — Product Service (Phase 5)
 *
 * All MongoDB/Mongoose business logic for inventory products.
 * Controllers are kept thin; all DB interaction happens here.
 */

import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import { parse as csvParse } from 'csv-parse/sync';
import { validateCsvRow, CSV_REQUIRED_HEADERS } from '../validators/product.validators.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_SORT_FIELDS = {
  name: 'name',
  purchasecost: 'purchaseCost',
  purchaseCost: 'purchaseCost',
  sellingprice: 'sellingPrice',
  sellingPrice: 'sellingPrice',
  quantity: 'quantity',
  dateadded: 'dateAdded',
  dateAdded: 'dateAdded',
  lastsaledate: 'lastSaleDate',
  lastSaleDate: 'lastSaleDate',
  createdat: 'createdAt',
  createdAt: 'createdAt',
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Maps a Mongoose duplicate-key error to a human-readable message.
 */
function handleDuplicateKeyError(err) {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field] || '';
    const msg =
      field === 'sku'
        ? `A product with SKU "${value}" already exists. SKUs must be unique.`
        : `Duplicate value for ${field}: "${value}"`;
    const e = new Error(msg);
    e.statusCode = 409;
    return e;
  }
  return null;
}

/**
 * Maps Mongoose ValidationError to an array of human-readable strings.
 */
function mongooseValidationMessages(err) {
  return Object.values(err.errors).map((e) => e.message);
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Returns a paginated list of products with optional search, filter, and sort.
 *
 * @param {{ search?, category?, sortBy?, order?, page?, limit? }} query
 * @returns {{ data: Product[], total: number, page: number, limit: number, totalPages: number }}
 */
export async function listProducts(query = {}, merchantId = null) {
  const {
    search = '',
    category = '',
    sortBy = 'createdAt',
    order = 'desc',
    page,
    limit,
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};

  if (merchantId) {
    filter.merchantId = merchantId;
  }

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  if (category && category.trim()) {
    filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  // Build sort
  const resolvedSort = ALLOWED_SORT_FIELDS[sortBy] || 'createdAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    Product.find(filter).sort({ [resolvedSort]: sortDir }).skip(skip).limit(limitNum).lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

/**
 * Returns a single product by ID scoped to merchant.
 * @param {string} id - MongoDB ObjectId string
 * @param {string|null} [merchantId=null]
 * @throws {Error} with statusCode 404 if not found
 */
export async function getProductById(id, merchantId = null) {
  const query = { _id: id };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  const product = await Product.findOne(query).lean({ virtuals: true });
  if (!product) {
    const err = new Error(`Product not found with id: ${id}`);
    err.statusCode = 404;
    throw err;
  }
  return product;
}

/**
 * Creates a new product.
 * @param {object} data - Validated product payload
 * @param {string|null} [merchantId=null]
 * @returns {Product} Created document
 * @throws {Error} with statusCode 409 on duplicate SKU; 422 on validation error
 */
export async function createProduct(data, merchantId = null) {
  try {
    const payload = { ...data };
    if (merchantId) {
      payload.merchantId = merchantId;
    }
    const product = new Product(payload);
    await product.save();
    return product.toObject({ virtuals: true });
  } catch (err) {
    const dupErr = handleDuplicateKeyError(err);
    if (dupErr) throw dupErr;

    if (err.name === 'ValidationError') {
      const e = new Error(mongooseValidationMessages(err).join('; '));
      e.statusCode = 422;
      throw e;
    }
    throw err;
  }
}

/**
 * Updates an existing product scoped to merchant.
 * @param {string} id - MongoDB ObjectId string
 * @param {object} data - Partial product payload to update
 * @param {string|null} [merchantId=null]
 * @returns {Product} Updated document
 * @throws {Error} with statusCode 404 if not found; 409 on duplicate SKU
 */
export async function updateProduct(id, data, merchantId = null) {
  try {
    const query = { _id: id };
    if (merchantId) {
      query.merchantId = merchantId;
    }
    const safeData = { ...data };
    delete safeData.merchantId; // prevent client spoofing/overwriting ownership

    const product = await Product.findOneAndUpdate(
      query,
      { $set: safeData },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!product) {
      const err = new Error(`Product not found with id: ${id}`);
      err.statusCode = 404;
      throw err;
    }
    return product;
  } catch (err) {
    if (err.statusCode) throw err;
    const dupErr = handleDuplicateKeyError(err);
    if (dupErr) throw dupErr;

    if (err.name === 'ValidationError') {
      const e = new Error(mongooseValidationMessages(err).join('; '));
      e.statusCode = 422;
      throw e;
    }
    throw err;
  }
}

/**
 * Deletes a product by ID scoped to merchant.
 * @param {string} id - MongoDB ObjectId string
 * @param {string|null} [merchantId=null]
 * @returns {{ deleted: true, id: string }}
 * @throws {Error} with statusCode 404 if not found
 */
export async function deleteProduct(id, merchantId = null) {
  const query = { _id: id };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  const product = await Product.findOneAndDelete(query);
  if (!product) {
    const err = new Error(`Product not found with id: ${id}`);
    err.statusCode = 404;
    throw err;
  }
  return { deleted: true, id };
}

/**
 * Calculates inventory summary metrics using a MongoDB aggregation pipeline.
 * These figures represent potential values, NOT actual realised cash or revenue.
 *
 * @param {string|null} [merchantId=null]
 * @returns {{ totalProducts, totalUnitsInStock, totalInventoryCostValue, potentialSalesValue, estimatedGrossProfit }}
 */
export async function getInventorySummary(merchantId = null) {
  const pipeline = [];
  if (merchantId) {
    const mId = typeof merchantId === 'string' && mongoose.Types.ObjectId.isValid(merchantId)
      ? new mongoose.Types.ObjectId(merchantId)
      : merchantId;
    pipeline.push({ $match: { merchantId: mId } });
  }

  pipeline.push({
    $group: {
      _id: null,
      totalProducts: { $sum: 1 },
      totalUnitsInStock: { $sum: '$quantity' },
      totalInventoryCostValue: {
        $sum: { $multiply: ['$purchaseCost', '$quantity'] },
      },
      potentialSalesValue: {
        $sum: { $multiply: ['$sellingPrice', '$quantity'] },
      },
      estimatedGrossProfit: {
        $sum: {
          $multiply: [{ $subtract: ['$sellingPrice', '$purchaseCost'] }, '$quantity'],
        },
      },
    },
  });

  const [result] = await Product.aggregate(pipeline);

  return {
    totalProducts: result?.totalProducts ?? 0,
    totalUnitsInStock: result?.totalUnitsInStock ?? 0,
    totalInventoryCostValue: result ? parseFloat(result.totalInventoryCostValue.toFixed(2)) : 0,
    potentialSalesValue: result ? parseFloat(result.potentialSalesValue.toFixed(2)) : 0,
    estimatedGrossProfit: result ? parseFloat(result.estimatedGrossProfit.toFixed(2)) : 0,
    note: 'Inventory cost value = purchaseCost × quantity. Potential sales value = sellingPrice × quantity. Estimated gross profit is at listed prices only and excludes operating expenses. None of these are actual realised cash.',
  };
}

/**
 * Returns all products for CSV export (respecting current search/category filters).
 * Does NOT apply pagination.
 *
 * @param {{ search?, category? }} filters
 * @returns {Product[]}
 */
export async function getAllProductsForExport(filters = {}, merchantId = null) {
  const { search = '', category = '' } = filters;
  const filter = {};

  if (merchantId) {
    filter.merchantId = merchantId;
  }

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  if (category && category.trim()) {
    filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  return Product.find(filter).sort({ createdAt: -1 }).lean({ virtuals: true });
}

/**
 * Parses and validates a CSV buffer.
 * Returns { validRows, invalidRows, duplicatesInFile, missingHeaders }
 *
 * @param {Buffer} buffer - Raw CSV file buffer
 * @returns {{ validRows: object[], invalidRows: { row: number, errors: string[], data: object }[], duplicatesInFile: string[], missingHeaders: string[] }}
 */
export function parseCsvBuffer(buffer) {
  if (buffer.byteLength > MAX_CSV_BYTES) {
    const e = new Error('CSV file exceeds the 5 MB size limit');
    e.statusCode = 413;
    throw e;
  }

  let records;
  try {
    records = csvParse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (parseErr) {
    const e = new Error(`CSV parse error: ${parseErr.message}`);
    e.statusCode = 400;
    throw e;
  }

  if (!records || records.length === 0) {
    const e = new Error('CSV file is empty or contains no data rows');
    e.statusCode = 400;
    throw e;
  }

  // Check headers
  const fileHeaders = Object.keys(records[0]).map((h) => h.trim().toLowerCase());
  const missingHeaders = CSV_REQUIRED_HEADERS.filter((h) => !fileHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return { validRows: [], invalidRows: [], duplicatesInFile: [], missingHeaders };
  }

  // Normalise all row keys to lowercase
  const normalisedRecords = records.map((r) => {
    const n = {};
    for (const [k, val] of Object.entries(r)) {
      n[k.trim().toLowerCase()] = val?.trim?.() ?? val;
    }
    return n;
  });

  // Detect SKU duplicates within the file itself
  const skuSeen = new Map();
  const duplicatesInFile = [];
  normalisedRecords.forEach((row, i) => {
    const sku = row.sku?.toUpperCase?.() ?? '';
    if (sku) {
      if (skuSeen.has(sku)) {
        duplicatesInFile.push(sku);
      } else {
        skuSeen.set(sku, i);
      }
    }
  });

  // Validate each row
  const validRows = [];
  const invalidRows = [];

  normalisedRecords.forEach((row, i) => {
    const { valid, errors } = validateCsvRow(row, i);
    if (valid) {
      validRows.push(row);
    } else {
      invalidRows.push({ row: i + 2, errors, data: row }); // +2: header row + 1-index
    }
  });

  return { validRows, invalidRows, duplicatesInFile, missingHeaders: [] };
}

/**
 * Maps a normalised CSV row object to a Product document payload.
 */
export function csvRowToProductPayload(row) {
  return {
    name: row.name,
    sku: row.sku?.toUpperCase?.() ?? row.sku,
    category: row.category,
    purchaseCost: Number(row.purchasecost),
    sellingPrice: Number(row.sellingprice),
    quantity: parseInt(row.quantity, 10),
    supplierName: row.suppliername || null,
    dateAdded: row.dateadded ? new Date(row.dateadded) : new Date(),
    lastSaleDate: row.lastsaledate ? new Date(row.lastsaledate) : null,
    expiryDate: row.expirydate ? new Date(row.expirydate) : null,
    condition: row.condition?.toLowerCase?.() || 'new',
    notes: row.notes || null,
    unitsSoldDuringPeriod: row.unitssoldduringperiod ? parseInt(row.unitssoldduringperiod, 10) : null,
    minimumDesiredProfitPerUnit: row.minimumdesiredprofitperunit ? Number(row.minimumdesiredprofitperunit) : null,
    minimumGrossMarginPercent: row.minimumgrossmarginpercent ? Number(row.minimumgrossmarginpercent) : null,
  };
}

/**
 * Imports validated CSV rows into the database.
 * Checks for existing SKU conflicts before writing.
 * Returns { created, skipped, skippedSkus }
 *
 * @param {object[]} validRows - Pre-validated CSV row objects
 * @returns {{ created: number, skipped: number, skippedSkus: string[], products: object[] }}
 */
export async function importCsvRows(validRows, merchantId = null) {
  const skus = validRows.map((r) => (r.sku?.toUpperCase?.() ?? r.sku));

  // Find which SKUs already exist in DB for this merchant
  const skuQuery = { sku: { $in: skus } };
  if (merchantId) {
    skuQuery.merchantId = merchantId;
  }
  const existingDocs = await Product.find(skuQuery).select('sku').lean();
  const existingSkus = new Set(existingDocs.map((d) => d.sku));

  const toInsert = [];
  const skippedSkus = [];

  for (const row of validRows) {
    const normalSku = row.sku?.toUpperCase?.() ?? row.sku;
    if (existingSkus.has(normalSku)) {
      skippedSkus.push(normalSku);
    } else {
      const payload = csvRowToProductPayload(row);
      if (merchantId) {
        payload.merchantId = merchantId;
      }
      toInsert.push(payload);
    }
  }

  let inserted = [];
  if (toInsert.length > 0) {
    inserted = await Product.insertMany(toInsert, { ordered: false });
  }

  return {
    created: inserted.length,
    skipped: skippedSkus.length,
    skippedSkus,
    products: inserted.map((p) => p.toObject({ virtuals: true })),
  };
}
