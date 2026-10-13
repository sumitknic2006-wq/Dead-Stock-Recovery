/**
 * StockSaathi AI — Dead Stock Analysis Routes (Phase 6)
 *
 * Mounts:
 * - GET /api/analysis/dead-stock
 * - GET /api/analysis/dead-stock/summary
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getDeadStockList, getDeadStockPortfolioSummary } from '../controllers/analysis.controller.js';

const router = Router();

// Enforce authentication for analysis (Phase 11)
router.use(requireAuth);

// Summary endpoint
router.get('/dead-stock/summary', getDeadStockPortfolioSummary);

// Paginated analysis endpoint
router.get('/dead-stock', getDeadStockList);

export default router;
