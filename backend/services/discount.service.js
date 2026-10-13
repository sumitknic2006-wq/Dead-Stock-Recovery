/**
 * StockSaathi AI — Discount Optimization Service (Phase 7)
 *
 * Deterministic, profit-safe dynamic discount calculation and recommendation engine.
 * Protects small retailer margins using strict mathematical floors and MongoDB product records.
 */

import Product from '../models/Product.model.js';
import {
  calculateDaysSinceLastSale,
  classifyStock,
  calculateRiskScore,
} from './deadStock.service.js';

// ── Financial Precision Helpers ───────────────────────────────────────────────

/**
 * Rounds a number to exactly 2 decimal places (paise precision)
 * avoiding floating point representation issues.
 */
export function round2(num) {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ── Core Financial Formulas ───────────────────────────────────────────────────

/**
 * Calculates minimum selling price floor and maximum safe discount.
 *
 * Formulas:
 * - Target Profit: P_min = C + V + G
 * - Target Margin: P_min = (C + V) / (1 - M), where M = targetMargin / 100
 * - Max Discount %: max(0, min(100, (1 - P_min / P) * 100))
 */
export function calculateMinimumPrice({
  purchaseCost,
  variableCostPerUnit = 0,
  constraintType,
  minimumDesiredProfitPerUnit = 0,
  minimumGrossMarginPercent = 0,
  currentSellingPrice = null,
}) {
  const C = Number(purchaseCost) || 0;
  const V = Number(variableCostPerUnit) || 0;
  const totalCost = C + V;

  let minimumAcceptablePrice = 0;

  if (constraintType === 'minimum_profit') {
    const G = Number(minimumDesiredProfitPerUnit) || 0;
    minimumAcceptablePrice = totalCost + G;
  } else if (constraintType === 'minimum_margin') {
    const marginPercent = Number(minimumGrossMarginPercent) || 0;
    if (marginPercent >= 100) {
      throw new Error('Gross margin target cannot be 100% or greater');
    }
    const M = marginPercent / 100;
    minimumAcceptablePrice = totalCost / (1 - M);
  } else {
    throw new Error(`Invalid constraintType "${constraintType}". Must be "minimum_profit" or "minimum_margin"`);
  }

  minimumAcceptablePrice = round2(minimumAcceptablePrice);

  let maximumSafeDiscountPercent = 0;
  let targetUnachievableAtListPrice = false;

  if (currentSellingPrice !== null && currentSellingPrice !== undefined) {
    const P = Number(currentSellingPrice);
    if (P <= 0) {
      maximumSafeDiscountPercent = 0;
    } else if (minimumAcceptablePrice > P) {
      maximumSafeDiscountPercent = 0;
      targetUnachievableAtListPrice = true;
    } else {
      const maxDiscount = ((P - minimumAcceptablePrice) / P) * 100;
      maximumSafeDiscountPercent = round2(Math.max(0, Math.min(100, maxDiscount)));
    }
  }

  return {
    purchaseCost: round2(C),
    variableCostPerUnit: round2(V),
    totalUnitCost: round2(totalCost),
    minimumAcceptablePrice,
    currentSellingPrice: currentSellingPrice !== null && currentSellingPrice !== undefined ? round2(Number(currentSellingPrice)) : null,
    maximumSafeDiscountPercent,
    targetUnachievableAtListPrice,
    constraintType,
    targetValue: constraintType === 'minimum_profit' ? Number(minimumDesiredProfitPerUnit) : Number(minimumGrossMarginPercent),
  };
}

/**
 * Calculates complete financial outcomes for a proposed discount.
 */
export function calculateDiscountFinancials({
  purchaseCost,
  sellingPrice,
  variableCostPerUnit = 0,
  quantity = 1,
  constraintType,
  minimumDesiredProfitPerUnit,
  minimumGrossMarginPercent,
  discountPercent,
  proposedSellingPrice,
}) {
  const C = Number(purchaseCost) || 0;
  const P = Number(sellingPrice) || 0;
  const V = Number(variableCostPerUnit) || 0;
  const Q = Number(quantity) || 1;

  // Derive proposedSellingPrice and discountPercent
  let proposedPrice = 0;
  let discountPct = 0;

  if (discountPercent !== undefined && discountPercent !== null && discountPercent !== '') {
    discountPct = round2(Number(discountPercent));
    proposedPrice = round2(P * (1 - discountPct / 100));
  } else if (proposedSellingPrice !== undefined && proposedSellingPrice !== null && proposedSellingPrice !== '') {
    proposedPrice = round2(Number(proposedSellingPrice));
    discountPct = P > 0 ? round2(((P - proposedPrice) / P) * 100) : 0;
    discountPct = Math.max(0, Math.min(100, discountPct));
  } else {
    throw new Error('Either discountPercent or proposedSellingPrice must be supplied');
  }

  // Calculate minimum price floor
  const floor = calculateMinimumPrice({
    purchaseCost: C,
    variableCostPerUnit: V,
    constraintType,
    minimumDesiredProfitPerUnit,
    minimumGrossMarginPercent,
    currentSellingPrice: P,
  });

  const P_min = floor.minimumAcceptablePrice;
  const D_max = floor.maximumSafeDiscountPercent;

  // Financial outcomes per unit
  const currentGrossProfitPerUnit = round2(P - C - V);
  const proposedGrossProfitPerUnit = round2(proposedPrice - C - V);
  const currentGrossMarginPercent = P > 0 ? round2(((P - C - V) / P) * 100) : 0;
  const proposedGrossMarginPercent = proposedPrice > 0 ? round2(((proposedPrice - C - V) / proposedPrice) * 100) : 0;
  const discountAmountPerUnit = round2(P - proposedPrice);

  // Financial outcomes for quantity Q
  const totalCostOfGoods = round2(C * Q);
  const totalVariableCosts = round2(V * Q);
  const expectedGrossSalesValue = round2(proposedPrice * Q);
  const expectedTotalGrossProfit = round2((proposedPrice - C - V) * Q);
  const totalDiscountLoss = round2(discountAmountPerUnit * Q);

  // Safety Evaluation: allowing a tiny 1-paisa epsilon for rounding
  const isSafe = proposedPrice >= P_min - 0.01;
  const shortfallPerUnit = isSafe ? 0 : round2(P_min - proposedPrice);
  const shortfallTotal = round2(shortfallPerUnit * Q);

  let financialWarning = null;
  const reasonCodes = [];
  let explanation = '';

  if (floor.targetUnachievableAtListPrice) {
    reasonCodes.push('TARGET_UNACHIEVABLE_AT_LIST_PRICE');
    financialWarning = `Your target floor (₹${P_min.toFixed(2)}) is higher than the current list price (₹${P.toFixed(2)}). Any discount breaches this constraint.`;
  }

  if (isSafe) {
    reasonCodes.push('OFFER_PROFIT_SAFE');
    if (discountPct === 0) {
      reasonCodes.push('ZERO_DISCOUNT');
      explanation = `Selling at full list price (₹${P.toFixed(2)}) yields ₹${proposedGrossProfitPerUnit.toFixed(2)} unit profit (${proposedGrossMarginPercent.toFixed(1)}% margin), comfortably above your floor.`;
    } else {
      explanation = `The proposed discount of ${discountPct}% (₹${proposedPrice.toFixed(2)}) preserves your target ${
        constraintType === 'minimum_profit'
          ? `profit floor of ₹${Number(minimumDesiredProfitPerUnit).toFixed(2)}/unit`
          : `margin floor of ${Number(minimumGrossMarginPercent).toFixed(1)}%`
      } (minimum safe price: ₹${P_min.toFixed(2)}).`;
    }
  } else {
    reasonCodes.push('CONSTRAINT_BREACHED');
    if (proposedPrice < C + V) {
      reasonCodes.push('NEGATIVE_GROSS_PROFIT');
    }
    financialWarning = `Unsafe proposal: Proposed price ₹${proposedPrice.toFixed(2)} breaches the minimum safe price (₹${P_min.toFixed(2)}) by ₹${shortfallPerUnit.toFixed(2)} per unit (₹${shortfallTotal.toFixed(2)} total across ${Q} units).`;
    explanation = `This discount generates a unit gross profit of ₹${proposedGrossProfitPerUnit.toFixed(2)} (${proposedGrossMarginPercent.toFixed(1)}% margin), which falls below your target floor of ₹${P_min.toFixed(2)}. The maximum safe discount you can offer is ${D_max}%.`;
  }

  return {
    isSafe,
    financialWarning,
    shortfallPerUnit,
    shortfallTotal,
    originalSellingPrice: round2(P),
    proposedSellingPrice: proposedPrice,
    minimumAcceptablePrice: P_min,
    maximumSafeDiscountPercent: D_max,
    discountAmountPerUnit,
    discountPercent: discountPct,
    quantity: Q,
    currentGrossProfitPerUnit,
    proposedGrossProfitPerUnit,
    currentGrossMarginPercent,
    proposedGrossMarginPercent,
    totalCostOfGoods,
    totalVariableCosts,
    expectedGrossSalesValue,
    expectedTotalGrossProfit,
    totalDiscountLoss,
    constraintType,
    targetValue: floor.targetValue,
    reasonCodes,
    explanation,
  };
}

// ── Product-Specific Recommendation Engine ────────────────────────────────────

/**
 * Generates an explainable, deterministic discount recommendation for a real MongoDB product.
 */
export async function recommendDiscountForProduct({
  productId,
  variableCostPerUnit = 0,
  quantity,
  constraintType,
  minimumDesiredProfitPerUnit,
  minimumGrossMarginPercent,
  merchantId = null,
}) {
  const query = { _id: productId };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  const product = await Product.findOne(query);
  if (!product) {
    const error = new Error(`Product with ID "${productId}" not found`);
    error.statusCode = 404;
    throw error;
  }

  const C = product.purchaseCost;
  const P = product.sellingPrice;
  const V = Number(variableCostPerUnit) || 0;
  const stockQty = product.quantity;

  // Selected quantity validation
  const Q = quantity !== undefined && quantity !== null && quantity !== '' ? Number(quantity) : (stockQty > 0 ? stockQty : 1);
  if (stockQty > 0 && Q > stockQty) {
    const error = new Error(`Requested quantity (${Q}) exceeds available stock quantity (${stockQty}) for ${product.name}`);
    error.statusCode = 400;
    throw error;
  }

  // Determine profit constraint: request overrides -> product model defaults -> standard retail default
  let effectiveConstraintType = constraintType;
  let effectiveDesiredProfit = minimumDesiredProfitPerUnit;
  let effectiveMarginPercent = minimumGrossMarginPercent;

  if (!effectiveConstraintType) {
    if (product.minimumGrossMarginPercent !== null && product.minimumGrossMarginPercent !== undefined) {
      effectiveConstraintType = 'minimum_margin';
      effectiveMarginPercent = product.minimumGrossMarginPercent;
    } else if (product.minimumDesiredProfitPerUnit !== null && product.minimumDesiredProfitPerUnit !== undefined) {
      effectiveConstraintType = 'minimum_profit';
      effectiveDesiredProfit = product.minimumDesiredProfitPerUnit;
    } else {
      // Conservative default floor: 15% minimum gross margin
      effectiveConstraintType = 'minimum_margin';
      effectiveMarginPercent = 15;
    }
  }

  // Phase 6 Dead Stock Analysis Integration
  const daysSinceLastSale = calculateDaysSinceLastSale(product.lastSaleDate);
  const classification = classifyStock(daysSinceLastSale, product.lastSaleDate);
  const riskAnalysis = calculateRiskScore(product, daysSinceLastSale, classification);

  // Compute price floor
  const floor = calculateMinimumPrice({
    purchaseCost: C,
    variableCostPerUnit: V,
    constraintType: effectiveConstraintType,
    minimumDesiredProfitPerUnit: effectiveDesiredProfit,
    minimumGrossMarginPercent: effectiveMarginPercent,
    currentSellingPrice: P,
  });

  const P_min = floor.minimumAcceptablePrice;
  const D_max = floor.maximumSafeDiscountPercent;

  let recommendedDiscountPercent = 0;
  const reasonCodes = [];
  let explanation = '';
  const dataLimitations = [];

  // Expiry proximity check
  let isNearExpiry = false;
  if (product.expiryDate) {
    const now = new Date();
    const daysToExpiry = Math.ceil((new Date(product.expiryDate) - now) / 86400000);
    if (daysToExpiry >= 0 && daysToExpiry <= 30) {
      isNearExpiry = true;
    }
  }

  if (floor.targetUnachievableAtListPrice || D_max <= 0) {
    recommendedDiscountPercent = 0;
    reasonCodes.push('NO_DISCOUNT_FEASIBLE', 'MARGIN_PROTECTED');
    explanation = `Current list price of ₹${P.toFixed(2)} is already at or below your target floor (₹${P_min.toFixed(2)}). No discount can be safely offered without violating your profit floor.`;
  } else {
    // Classification-based deterministic strategy
    switch (classification) {
      case 'healthy':
        recommendedDiscountPercent = 0;
        reasonCodes.push('HEALTHY_NO_DISCOUNT_NEEDED');
        explanation = 'Healthy product with active sales velocity. Avoid discounting to preserve profit margin; maintain standard promotional pricing.';
        break;

      case 'slow_moving': {
        // Modest discount: min(10%, 40% of max safe discount)
        const suggested = Math.min(10, round2(D_max * 0.4));
        recommendedDiscountPercent = Math.max(0, suggested);
        reasonCodes.push('SLOW_MOVING_MODEST_DISCOUNT', 'PROFIT_SAFE');
        explanation = `Slow-moving inventory (${daysSinceLastSale} days since last sale). A modest promotional discount of ${recommendedDiscountPercent}% stimulates velocity while protecting gross margin.`;
        break;
      }

      case 'at_risk': {
        // Targeted clearance discount: min(20%, 75% of max safe discount)
        const suggested = Math.min(20, round2(D_max * 0.75));
        recommendedDiscountPercent = Math.max(0, suggested);
        reasonCodes.push('AT_RISK_TARGETED_DISCOUNT', 'PROFIT_SAFE');
        explanation = `At-risk inventory (${daysSinceLastSale} days since last sale). A targeted clearance discount of ${recommendedDiscountPercent}% accelerates cash recovery before deeper stagnation.`;
        break;
      }

      case 'critical_dead_stock': {
        // Maximum profit-safe clearance discount: min(35%, max safe discount)
        const suggested = Math.min(35, D_max);
        recommendedDiscountPercent = Math.max(0, suggested);
        reasonCodes.push('DEAD_STOCK_CLEARANCE_DISCOUNT', 'PROFIT_SAFE');
        explanation = `Critical dead stock (${daysSinceLastSale} days since last sale). Recommended aggressive clearance markdown of ${recommendedDiscountPercent}% to unlock liquid cash without incurring an operating loss.`;
        break;
      }

      case 'insufficient_data':
      default: {
        // Conservative discount: min(5%, 25% of max safe discount)
        const suggested = Math.min(5, round2(D_max * 0.25));
        recommendedDiscountPercent = Math.max(0, suggested);
        reasonCodes.push('INSUFFICIENT_DATA_CAUTIOUS');
        explanation = `Insufficient sales history available. Cautious promotional discount of ${recommendedDiscountPercent}% recommended pending sales velocity verification.`;
        dataLimitations.push('Stock age cannot be reliably verified due to missing or unverified last sale date.');
        break;
      }
    }

    // Expiry urgency adjustment
    if (isNearExpiry && D_max > recommendedDiscountPercent) {
      recommendedDiscountPercent = Math.min(D_max, Math.max(recommendedDiscountPercent, 25));
      reasonCodes.push('EXPIRY_URGENCY');
      explanation += ` Clearance urgency escalated due to impending product expiry within 30 days.`;
    }
  }

  // Calculate full financials for recommended offer
  const proposedSellingPrice = round2(P * (1 - recommendedDiscountPercent / 100));
  const financials = calculateDiscountFinancials({
    purchaseCost: C,
    sellingPrice: P,
    variableCostPerUnit: V,
    quantity: Q,
    constraintType: effectiveConstraintType,
    minimumDesiredProfitPerUnit: effectiveDesiredProfit,
    minimumGrossMarginPercent: effectiveMarginPercent,
    discountPercent: recommendedDiscountPercent,
  });

  dataLimitations.push(
    `Recommendation assumes zero additional variable costs unless specified (current V = ₹${V.toFixed(2)}).`,
    'Does not account for supplier return agreements or local competitor price matching.'
  );

  return {
    product: {
      id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      stockQuantity: stockQty,
      purchaseCost: round2(C),
      sellingPrice: round2(P),
      minimumDesiredProfitPerUnit: product.minimumDesiredProfitPerUnit,
      minimumGrossMarginPercent: product.minimumGrossMarginPercent,
    },
    analysis: {
      classification,
      daysSinceLastSale,
      riskScore: riskAnalysis.riskScore,
      riskSeverity: riskAnalysis.riskSeverity,
      isProvisional: riskAnalysis.isProvisional,
    },
    recommendation: {
      recommendedDiscountPercent,
      recommendedSellingPrice: proposedSellingPrice,
      minimumAcceptableSellingPrice: P_min,
      maximumSafeDiscountPercent: D_max,
      expectedGrossProfitPerUnit: financials.proposedGrossProfitPerUnit,
      expectedGrossMarginPercent: financials.proposedGrossMarginPercent,
      expectedTotalGrossProfit: financials.expectedTotalGrossProfit,
      expectedGrossSalesValue: financials.expectedGrossSalesValue,
      selectedQuantity: Q,
      isSafe: financials.isSafe,
      reasonCodes,
      explanation,
      financialWarning: financials.financialWarning,
      dataLimitations,
    },
    financials,
  };
}
