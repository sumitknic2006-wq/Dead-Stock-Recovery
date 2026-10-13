/**
 * StockSaathi AI — Campaign Controller (Phase 9)
 *
 * REST API handlers for WhatsApp Clearance Campaign generation,
 * retrieval, updates, archiving, and health checks.
 */

import { getDatabaseStatus } from '../config/db.js';
import {
  generateCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  archiveCampaign,
} from '../services/campaign.service.js';
import {
  validateGenerateCampaignRequest,
  validateUpdateCampaignRequest,
  validateGetCampaignsQuery,
} from '../validators/campaign.validator.js';

/**
 * POST /api/campaigns/generate
 * Generates and saves a profit-safe promotional campaign.
 */
export async function generateCampaignHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot generate campaign.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateGenerateCampaignRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid campaign generation parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await generateCampaign(req.body, new Date(), merchantId);

    return res.status(201).json({
      success: true,
      message: 'WhatsApp Clearance Campaign generated and saved as draft',
      data: result.campaign,
      financialBreakdown: result.financialBreakdown,
      riskClassification: result.riskClassification,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
          safetyDetails: error.safetyDetails || null,
        },
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 404,
        },
      });
    }
    return next(error);
  }
}

/**
 * GET /api/campaigns
 * Retrieves paginated campaigns with optional filters.
 */
export async function getCampaignsHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve campaigns.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateGetCampaignsQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid campaign query parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await getCampaigns(req.query, merchantId);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/campaigns/:id
 * Retrieves a single campaign by ID.
 */
export async function getCampaignByIdHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve campaign.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const campaign = await getCampaignById(req.params.id, merchantId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Campaign with ID "${req.params.id}" not found`,
          statusCode: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
        },
      });
    }
    return next(error);
  }
}

/**
 * PATCH /api/campaigns/:id
 * Updates campaign text, audience, tone, status, or discount.
 */
export async function updateCampaignHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot update campaign.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateUpdateCampaignRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid campaign update parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const updated = await updateCampaign(req.params.id, req.body, merchantId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Campaign with ID "${req.params.id}" not found`,
          statusCode: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
        },
      });
    }
    return next(error);
  }
}

/**
 * POST /api/campaigns/:id/archive
 * Archives a campaign without deleting historical records.
 */
export async function archiveCampaignHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot archive campaign.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const archived = await archiveCampaign(req.params.id, merchantId);
    if (!archived) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Campaign with ID "${req.params.id}" not found`,
          statusCode: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign archived successfully',
      data: archived,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
        },
      });
    }
    return next(error);
  }
}

/**
 * GET /api/campaigns/health
 * Returns campaign generator engine health and DB connection state.
 */
export function getCampaignHealthHandler(_req, res) {
  const dbStatus = getDatabaseStatus();
  return res.status(200).json({
    success: true,
    service: 'campaign-generator',
    version: '1.0.0 (Phase 9)',
    database: dbStatus.status,
  });
}
