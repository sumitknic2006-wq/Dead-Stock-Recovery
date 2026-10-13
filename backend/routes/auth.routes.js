/**
 * StockSaathi AI — Auth Routes (Phase 11)
 *
 * Mounts merchant authentication endpoints under /api/auth.
 */

import express from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', requireAuth, meHandler);

export default router;
