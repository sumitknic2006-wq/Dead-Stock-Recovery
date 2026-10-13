/**
 * StockSaathi AI — Campaign Routes (Phase 9)
 *
 * Mounts:
 * - POST /api/campaigns/generate
 * - GET  /api/campaigns
 * - GET  /api/campaigns/health
 * - GET  /api/campaigns/:id
 * - PATCH /api/campaigns/:id
 * - POST /api/campaigns/:id/archive
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  generateCampaignHandler,
  getCampaignsHandler,
  getCampaignByIdHandler,
  updateCampaignHandler,
  archiveCampaignHandler,
  getCampaignHealthHandler,
} from '../controllers/campaign.controller.js';

const router = express.Router();

router.get('/health', getCampaignHealthHandler);
router.post('/generate', requireAuth, generateCampaignHandler);
router.get('/', requireAuth, getCampaignsHandler);
router.get('/:id', requireAuth, getCampaignByIdHandler);
router.patch('/:id', requireAuth, updateCampaignHandler);
router.post('/:id/archive', requireAuth, archiveCampaignHandler);

export default router;
