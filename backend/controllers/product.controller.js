/**
 * StockSaathi AI — Product Controller (Phase 5)
 *
 * Thin request/response handlers. All business logic lives in product.service.js.
 * CSV export is generated here since it writes directly to the HTTP response.
 */

import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventorySummary,
  getAllProductsForExport,
  parseCsvBuffer,
  importCsvRows,
} from '../services/product.service.js';
import { validateProductCreate, validateProductUpdate, isValidObjectId } from '../validators/product.validators.js';

// ── Response helpers ──────────────────────────────────────────────────────────

const ok = (res, data, statusCode = 200) => res.status(statusCode).json({ success: true, ...data });

const fail = (res, message, statusCode = 400, extra = {}) =>
  res.status(statusCode).json({ success: false, error: { message, statusCode, ...extra } });

// ── ID guard ─────────────────────────────────────────────────────────────────

function requireValidId(req, res) {
  if (!isValidObjectId(req.params.id)) {
    fail(res, `Invalid product id: "${req.params.id}"`, 400);
    return false;
  }
  return true;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/products
 */
export async function getAllProducts(req, res, next) {
  try {
    const merchantId = req.merchant?.id || null;
    const result = await listProducts(req.query, merchantId);
    return ok(res, {
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/summary
 */
export async function getProductSummary(req, res, next) {
  try {
    const merchantId = req.merchant?.id || null;
    const summary = await getInventorySummary(merchantId);
    return ok(res, { data: summary });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 */
export async function getOneProduct(req, res, next) {
  if (!requireValidId(req, res)) return;
  try {
    const merchantId = req.merchant?.id || null;
    const product = await getProductById(req.params.id, merchantId);
    return ok(res, { data: product });
  } catch (err) {
    if (err.statusCode === 404) return fail(res, err.message, 404);
    next(err);
  }
}

/**
 * POST /api/products
 */
export async function createOneProduct(req, res, next) {
  const { valid, errors } = validateProductCreate(req.body);
  if (!valid) return fail(res, 'Validation failed', 422, { fields: errors });

  try {
    const merchantId = req.merchant?.id || null;
    const product = await createProduct(req.body, merchantId);
    return ok(res, { data: product }, 201);
  } catch (err) {
    if (err.statusCode === 409) return fail(res, err.message, 409);
    if (err.statusCode === 422) return fail(res, err.message, 422);
    next(err);
  }
}

/**
 * PUT /api/products/:id
 */
export async function updateOneProduct(req, res, next) {
  if (!requireValidId(req, res)) return;

  const { valid, errors } = validateProductUpdate(req.body);
  if (!valid) return fail(res, 'Validation failed', 422, { fields: errors });

  try {
    const merchantId = req.merchant?.id || null;
    const product = await updateProduct(req.params.id, req.body, merchantId);
    return ok(res, { data: product });
  } catch (err) {
    if (err.statusCode === 404) return fail(res, err.message, 404);
    if (err.statusCode === 409) return fail(res, err.message, 409);
    if (err.statusCode === 422) return fail(res, err.message, 422);
    next(err);
  }
}

/**
 * DELETE /api/products/:id
 */
export async function deleteOneProduct(req, res, next) {
  if (!requireValidId(req, res)) return;
  try {
    const merchantId = req.merchant?.id || null;
    const result = await deleteProduct(req.params.id, merchantId);
    return ok(res, { data: result, message: 'Product deleted successfully' });
  } catch (err) {
    if (err.statusCode === 404) return fail(res, err.message, 404);
    next(err);
  }
}

/**
 * POST /api/products/csv/preview
 * Parses and validates a CSV buffer; returns preview without writing to DB.
 */
export async function previewCsvImport(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return fail(res, 'No CSV file uploaded. Send a file with field name "file".', 400);
    }

    const result = parseCsvBuffer(req.file.buffer);

    if (result.missingHeaders.length > 0) {
      return fail(res, `CSV is missing required columns: ${result.missingHeaders.join(', ')}`, 400, {
        missingHeaders: result.missingHeaders,
      });
    }

    return ok(res, {
      data: {
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        duplicatesInFile: result.duplicatesInFile,
        validCount: result.validRows.length,
        invalidCount: result.invalidRows.length,
        duplicateInFileCount: result.duplicatesInFile.length,
      },
    });
  } catch (err) {
    if (err.statusCode) return fail(res, err.message, err.statusCode);
    next(err);
  }
}

/**
 * POST /api/products/csv/import
 * Validates then commits valid rows to DB. Reports created and skipped counts.
 */
export async function commitCsvImport(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return fail(res, 'No CSV file uploaded. Send a file with field name "file".', 400);
    }

    const parseResult = parseCsvBuffer(req.file.buffer);

    if (parseResult.missingHeaders.length > 0) {
      return fail(res, `CSV is missing required columns: ${parseResult.missingHeaders.join(', ')}`, 400, {
        missingHeaders: parseResult.missingHeaders,
      });
    }

    if (parseResult.validRows.length === 0) {
      return fail(res, 'No valid rows found in CSV. Fix validation errors and re-upload.', 422, {
        invalidRows: parseResult.invalidRows,
      });
    }

    const merchantId = req.merchant?.id || null;
    const importResult = await importCsvRows(parseResult.validRows, merchantId);

    return ok(res, {
      data: {
        created: importResult.created,
        skipped: importResult.skipped,
        skippedSkus: importResult.skippedSkus,
        invalidCount: parseResult.invalidRows.length,
        invalidRows: parseResult.invalidRows,
        products: importResult.products,
      },
      message: `Import complete: ${importResult.created} created, ${importResult.skipped} skipped (duplicate SKU), ${parseResult.invalidRows.length} invalid rows rejected.`,
    }, 207);
  } catch (err) {
    if (err.statusCode) return fail(res, err.message, err.statusCode);
    next(err);
  }
}

/**
 * GET /api/products/csv/export
 * Streams CSV of all (or filtered) products.
 */
export async function exportCsv(req, res, next) {
  try {
    const merchantId = req.merchant?.id || null;
    const products = await getAllProductsForExport({
      search: req.query.search,
      category: req.query.category,
    }, merchantId);

    const HEADERS = [
      'name', 'sku', 'category', 'purchaseCost', 'sellingPrice', 'quantity',
      'inventoryCostValue', 'supplierName', 'dateAdded', 'lastSaleDate',
      'expiryDate', 'condition', 'notes', 'unitsSoldDuringPeriod',
      'minimumDesiredProfitPerUnit', 'minimumGrossMarginPercent',
    ];

    function escapeCell(v) {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }

    function formatDate(d) {
      if (!d) return '';
      return new Date(d).toISOString().slice(0, 10);
    }

    const rows = [
      HEADERS.join(','),
      ...products.map((p) =>
        [
          escapeCell(p.name),
          escapeCell(p.sku),
          escapeCell(p.category),
          escapeCell(p.purchaseCost),
          escapeCell(p.sellingPrice),
          escapeCell(p.quantity),
          escapeCell(p.inventoryCostValue),
          escapeCell(p.supplierName),
          formatDate(p.dateAdded),
          formatDate(p.lastSaleDate),
          formatDate(p.expiryDate),
          escapeCell(p.condition),
          escapeCell(p.notes),
          escapeCell(p.unitsSoldDuringPeriod),
          escapeCell(p.minimumDesiredProfitPerUnit),
          escapeCell(p.minimumGrossMarginPercent),
        ].join(',')
      ),
    ];

    const csv = rows.join('\r\n');
    const filename = `stocksaathi-inventory-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
