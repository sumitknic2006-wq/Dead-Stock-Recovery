/**
 * StockSaathi AI — Discount Controller (Phase 7)
 *
 * REST API handlers for profit-safe discount calculation, minimum price floors,
 * and product-specific discount recommendations.
 */

import Product from '../models/Product.model.js';
import { getDatabaseStatus } from '../config/db.js';
import {
  calculateDiscountFinancials,
  calculateMinimumPrice,
  recommendDiscountForProduct,
} from '../services/discount.service.js';
import {
  validateCalculateDiscountRequest,
  validateMinimumPriceRequest,
  validateRecommendDiscountRequest,
} from '../validators/discount.validator.js';

/**
 * POST /api/discounts/calculate
 * Calculates financial results and evaluates safety for a proposed discount.
 */
export async function calculateDiscount(req, res, next) {
  try {
    const validation = validateCalculateDiscountRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid discount calculation parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    let purchaseCost = req.body.purchaseCost;
    let sellingPrice = req.body.sellingPrice;
    let productDoc = null;

    if (req.body.productId) {
      const dbStatus = getDatabaseStatus();
      if (dbStatus.status !== 'connected') {
        return res.status(503).json({
          success: false,
          error: {
            message: 'Database is not connected. Cannot retrieve product records for discount calculation.',
            statusCode: 503,
            databaseStatus: dbStatus.status,
          },
        });
      }

      const merchantId = req.merchant?.id || null;
      const query = { _id: req.body.productId };
      if (merchantId) query.merchantId = merchantId;
      productDoc = await Product.findOne(query);
      if (!productDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Product with ID "${req.body.productId}" not found`,
            statusCode: 404,
          },
        });
      }

      // Quantity validation against stock
      const requestedQty = Number(req.body.quantity || 1);
      if (productDoc.quantity > 0 && requestedQty > productDoc.quantity) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Requested quantity (${requestedQty}) exceeds available stock quantity (${productDoc.quantity}) for ${productDoc.name}`,
            statusCode: 400,
          },
        });
      }

      purchaseCost = productDoc.purchaseCost;
      sellingPrice = productDoc.sellingPrice;
    }

    const result = calculateDiscountFinancials({
      purchaseCost,
      sellingPrice,
      variableCostPerUnit: req.body.variableCostPerUnit || 0,
      quantity: req.body.quantity || 1,
      constraintType: req.body.constraintType,
      minimumDesiredProfitPerUnit: req.body.minimumDesiredProfitPerUnit,
      minimumGrossMarginPercent: req.body.minimumGrossMarginPercent,
      discountPercent: req.body.discountPercent,
      proposedSellingPrice: req.body.proposedSellingPrice,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        productId: req.body.productId || null,
        productName: productDoc ? productDoc.name : null,
        sku: productDoc ? productDoc.sku : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/discounts/minimum-price
 * Calculates the minimum acceptable selling price and maximum safe discount.
 */
export async function getMinimumPrice(req, res, next) {
  try {
    const validation = validateMinimumPriceRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid minimum price parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    let purchaseCost = req.body.purchaseCost;
    let sellingPrice = req.body.sellingPrice;
    let productDoc = null;

    if (req.body.productId) {
      const dbStatus = getDatabaseStatus();
      if (dbStatus.status !== 'connected') {
        return res.status(503).json({
          success: false,
          error: {
            message: 'Database is not connected. Cannot retrieve product records for minimum price calculation.',
            statusCode: 503,
            databaseStatus: dbStatus.status,
          },
        });
      }

      const merchantId = req.merchant?.id || null;
      const query = { _id: req.body.productId };
      if (merchantId) query.merchantId = merchantId;
      productDoc = await Product.findOne(query);
      if (!productDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Product with ID "${req.body.productId}" not found`,
            statusCode: 404,
          },
        });
      }

      purchaseCost = productDoc.purchaseCost;
      sellingPrice = productDoc.sellingPrice;
    }

    const result = calculateMinimumPrice({
      purchaseCost,
      variableCostPerUnit: req.body.variableCostPerUnit || 0,
      constraintType: req.body.constraintType,
      minimumDesiredProfitPerUnit: req.body.minimumDesiredProfitPerUnit,
      minimumGrossMarginPercent: req.body.minimumGrossMarginPercent,
      currentSellingPrice: sellingPrice,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        productId: req.body.productId || null,
        productName: productDoc ? productDoc.name : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/discounts/recommend
 * Generates an explainable, profit-safe discount recommendation for an inventory item.
 */
export async function getDiscountRecommendation(req, res, next) {
  try {
    const validation = validateRecommendDiscountRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid discount recommendation parameters',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot generate discount recommendation.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const merchantId = req.merchant?.id || null;
    const result = await recommendDiscountForProduct({ ...req.body, merchantId });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      });
    }
    next(error);
  }
}

/**
 * GET /api/discounts/health
 * Returns the status of the profit-safe discount engine without leaking secrets.
 */
export function getDiscountHealth(_req, res) {
  const dbStatus = getDatabaseStatus();
  return res.status(200).json({
    success: true,
    engine: 'profit-safe-discount-optimization',
    status: 'ok',
    version: '1.0.0 (Phase 7)',
    database: dbStatus.status,
  });
}
