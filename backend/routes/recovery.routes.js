/**
 * StockSaathi AI — Recovery Routes (Phase 8)
 *
 * Mounts:
 * - GET   /api/recovery/plan
 * - GET   /api/recovery/summary
 * - POST  /api/recovery/plan/generate
 * - PATCH /api/recovery/actions/:id/status
 * - GET   /api/recovery/health
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getActivePlan,
  getPlanSummary,
  generatePlan,
  updateAction,
} from '../controllers/recovery.controller.js';

const router = express.Router();

router.get('/plan', requireAuth, getActivePlan);
router.get('/summary', requireAuth, getPlanSummary);
router.post('/plan/generate', requireAuth, generatePlan);
router.patch('/actions/:id/status', requireAuth, updateAction);
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'recovery-planner',
    version: '1.0.0',
    phase: 'Phase 8 — 7-Day Dead Stock Recovery Action Planner',
  });
});

export default router;
