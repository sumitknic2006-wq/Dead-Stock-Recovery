/**
 * StockSaathi AI — Dead Stock Analysis Controller (Phase 6)
 *
 * REST API handlers for dead stock detection, risk scoring, and dashboard aggregations.
 */

import { getDeadStockAnalysis, getDeadStockSummary } from '../services/deadStock.service.js';
import { getDatabaseStatus } from '../config/db.js';

/**
 * GET /api/analysis/dead-stock
 * Returns paginated products with deterministic risk scores, stock age, and recommendations.
 */
export async function getDeadStockList(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot perform dead stock analysis.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await getDeadStockAnalysis(req.query, new Date(), merchantId);
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analysis/dead-stock/summary
 * Returns portfolio-wide dead stock aggregations and top 6 priority items for dashboard cards.
 */
export async function getDeadStockPortfolioSummary(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve dead stock summary.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await getDeadStockSummary(new Date(), merchantId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
