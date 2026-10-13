/**
 * StockSaathi AI — Discount Routes (Phase 7)
 *
 * Mounts:
 * - POST /api/discounts/calculate
 * - POST /api/discounts/minimum-price
 * - POST /api/discounts/recommend
 * - GET  /api/discounts/health
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  calculateDiscount,
  getMinimumPrice,
  getDiscountRecommendation,
  getDiscountHealth,
} from '../controllers/discount.controller.js';

const router = express.Router();

router.post('/calculate', requireAuth, calculateDiscount);
router.post('/minimum-price', requireAuth, getMinimumPrice);
router.post('/recommend', requireAuth, getDiscountRecommendation);
router.get('/health', getDiscountHealth);

export default router;
