import express from 'express';
import { getDatabaseStatus } from '../config/db.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health-check endpoint indicating backend and database operational status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isDbConnected = dbStatus.status === 'connected';

  res.status(200).json({
    status: isDbConnected ? 'ok' : 'degraded',
    message: isDbConnected
      ? 'StockSaathi AI Backend and Database are running smoothly'
      : 'StockSaathi AI Backend is running (Database is not connected)',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.status
    }
  });
});

export default router;
