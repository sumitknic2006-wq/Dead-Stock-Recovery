/**
 * StockSaathi AI — Product Routes (Phase 5)
 *
 * Mounts all /api/products endpoints.
 * CSV upload uses multer (memory storage, 5 MB limit).
 *
 * Route order matters:
 *  - /summary and /csv/* are declared BEFORE /:id to avoid "summary" being treated as an ObjectId.
 */

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getAllProducts,
  getProductSummary,
  getOneProduct,
  createOneProduct,
  updateOneProduct,
  deleteOneProduct,
  previewCsvImport,
  commitCsvImport,
  exportCsv,
} from '../controllers/product.controller.js';

const router = express.Router();

// Enforce authentication across all product operations (Phase 11)
router.use(requireAuth);

// Multer: memory storage, accept only CSV, max 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
    const okMime = allowed.includes(file.mimetype);
    const okExt = /\.csv$/i.test(file.originalname);
    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'), false);
    }
  },
});

// Multer error handler middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: { message: `File upload error: ${err.message}`, statusCode: 400 } });
  }
  if (err && err.message) {
    return res.status(400).json({ success: false, error: { message: err.message, statusCode: 400 } });
  }
  next(err);
}

// ── Static routes (MUST come before /:id) ────────────────────────────────────

/** GET /api/products/summary — Inventory aggregation metrics */
router.get('/summary', getProductSummary);

/** GET /api/products/csv/export — Download all products as CSV */
router.get('/csv/export', exportCsv);

/** POST /api/products/csv/preview — Parse + validate CSV, return preview */
router.post('/csv/preview', upload.single('file'), handleMulterError, previewCsvImport);

/** POST /api/products/csv/import — Parse, validate, and commit CSV to DB */
router.post('/csv/import', upload.single('file'), handleMulterError, commitCsvImport);

// ── CRUD routes ───────────────────────────────────────────────────────────────

/** GET /api/products — Paginated product list with search/filter/sort */
router.get('/', getAllProducts);

/** POST /api/products — Create a new product */
router.post('/', createOneProduct);

/** GET /api/products/:id — Single product details */
router.get('/:id', getOneProduct);

/** PUT /api/products/:id — Update a product */
router.put('/:id', updateOneProduct);

/** DELETE /api/products/:id — Delete a product */
router.delete('/:id', deleteOneProduct);

export default router;
