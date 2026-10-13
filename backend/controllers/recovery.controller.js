/**
 * StockSaathi AI — Recovery Controller (Phase 8)
 *
 * REST API handlers for 7-Day Dead Stock Recovery Action Planner:
 * plan retrieval, summary metrics, safe regeneration, and action status transitions.
 */

import { getDatabaseStatus } from '../config/db.js';
import {
  generateSevenDayRecoveryPlan,
  getActiveRecoveryPlan,
  getRecoveryPlanSummary,
  updateActionStatus,
} from '../services/recovery.service.js';
import {
  validateGeneratePlanRequest,
  validateGetPlanQuery,
  validateUpdateActionStatusRequest,
} from '../validators/recovery.validator.js';

/**
 * GET /api/recovery/plan
 * Retrieves the currently active 7-day recovery plan with optional filters.
 */
export async function getActivePlan(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve recovery plan.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateGetPlanQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid plan query parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const plan = await getActiveRecoveryPlan(req.query, merchantId);

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/recovery/summary
 * Returns overall plan execution progress and financial recovery metrics.
 */
export async function getPlanSummary(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve recovery summary.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const summary = await getRecoveryPlanSummary(req.query?.planId, merchantId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/recovery/plan/generate
 * Creates or regenerates a 7-day recovery plan using current inventory and risk data.
 */
export async function generatePlan(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot generate recovery plan.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateGeneratePlanRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid plan generation options',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const preserveCompleted =
      req.body.preserveCompleted !== undefined
        ? req.body.preserveCompleted === true || req.body.preserveCompleted === 'true'
        : true;

    const forceReset =
      req.body.forceReset !== undefined
        ? req.body.forceReset === true || req.body.forceReset === 'true'
        : false;

    const merchantId = req.merchant?.id || null;
    const plan = await generateSevenDayRecoveryPlan({
      startDate: req.body.startDate,
      preserveCompleted,
      forceReset,
      merchantId,
    });

    return res.status(201).json({
      success: true,
      message: '7-Day Dead Stock Recovery Action Plan generated successfully',
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/recovery/actions/:id/status
 * Updates an action item's status and execution notes.
 */
export async function updateAction(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot update recovery action.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const actionId = req.params.id;
    const validation = validateUpdateActionStatusRequest(actionId, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid action update parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await updateActionStatus({
      actionId,
      status: req.body.status,
      notes: req.body.notes,
      merchantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Recovery action with ID ${actionId} not found in active plan`,
          statusCode: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Action status updated successfully',
      data: result.action,
      planStatus: result.planStatus,
    });
  } catch (error) {
    return next(error);
  }
}
