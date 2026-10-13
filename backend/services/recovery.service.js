/**
 * StockSaathi AI — 7-Day Dead Stock Recovery Action Planner Service (Phase 8)
 *
 * Generates practical 7-day cash recovery action schedules from live MongoDB inventory,
 * applying Phase 6 risk scoring and Phase 7 profit-safe price floors.
 *
 * Financial Safeguards:
 * - Proposed selling price is strictly >= minimum safe price (P_min).
 * - Safe discount capacity is enforced; if 0, non-discount actions are chosen.
 * - Completed actions are preserved across regenerations by default.
 */

import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import RecoveryPlan from '../models/RecoveryPlan.model.js';
import { analyzeProduct, getUtcMidnight } from './deadStock.service.js';
import {
  calculateMinimumPrice,
  recommendDiscountForProduct,
  round2,
} from './discount.service.js';

// ── Action Templates & Strategy ───────────────────────────────────────────────

const DAY_STRATEGIES = [
  {
    day: 1,
    theme: 'Immediate Cash Unlock',
    actionType: 'profit_safe_clearance',
    fallbackActionType: 'merchandising_display',
    title: 'Flash Clearance Launch: High-Risk Dead Stock',
    instructions:
      'Launch a profit-safe 48-hour flash clearance offer for this high-risk item. Feature prominently in digital messaging and at front-of-store display.',
    rationale:
      'Critical dead stock with high capital tie-up requires immediate cash conversion before further depreciation.',
  },
  {
    day: 2,
    theme: 'Bundle & Cross-Merchandise',
    actionType: 'bundle_compatible',
    fallbackActionType: 'bundle_compatible',
    title: 'Complementary Bundle Offer',
    instructions:
      'Pair this slow-moving item with a high-velocity complementary product. Offer a combined package saving while maintaining total bundle profit above cost floor.',
    rationale:
      'Leverages fast-moving traffic to pull stagnant stock without standalone price erosion.',
  },
  {
    day: 3,
    theme: 'VIP & Direct Customer Outreach',
    actionType: 'targeted_promotion',
    fallbackActionType: 'targeted_promotion',
    title: 'Loyal Customer Exclusive Preview',
    instructions:
      'Initiate targeted outreach to frequent buyers or registered customers with an exclusive limited-quantity offer before wider public discounting.',
    rationale:
      'Direct customer engagement drives fast conversions with zero public price signaling to competitors.',
  },
  {
    day: 4,
    theme: 'Bulk Reseller / B2B Outreach',
    actionType: 'reseller_outreach',
    fallbackActionType: 'merchandising_display',
    title: 'Bulk Lot Liquidation Outreach',
    instructions:
      'Contact local trade buyers, institutional clients, or neighboring merchants to negotiate a bulk clearance deal at or above unit floor price.',
    rationale:
      'Large unit quantities tied up in slow stock benefit from wholesale volume disposal even at modest margins.',
  },
  {
    day: 5,
    theme: 'In-Store Markdown & Feature',
    actionType: 'profit_safe_clearance',
    fallbackActionType: 'merchandising_display',
    title: 'In-Store Featured Price Reduction',
    instructions:
      'Apply high-visibility promotional shelf tags showing original list price and current profit-safe clearance price to capture weekend foot traffic.',
    rationale:
      'Visual in-store price cues stimulate spontaneous purchases from existing walk-in retail shoppers.',
  },
  {
    day: 6,
    theme: 'Visual Merchandising & Eye-Level Display',
    actionType: 'merchandising_display',
    fallbackActionType: 'merchandising_display',
    title: 'Checkout Counter & Eye-Level Placement',
    instructions:
      'Relocate unsold units to eye-level shelving near the billing counter or entrance aisle. Add "Limited Stock / Special Offer" signage.',
    rationale:
      'Poor shelf placement often suppresses demand; high-traffic counter positioning stimulates impulse buys with zero discount cost.',
  },
  {
    day: 7,
    theme: 'Final Review & Reallocation',
    actionType: 'final_review_reallocate',
    fallbackActionType: 'audit_sales_data',
    title: 'Clearance Audit & Vendor Return / Write-Down Review',
    instructions:
      'Conduct physical stock reconciliation for remaining units. Review supplier return eligibility, scrap reallocation, or final vendor credit options.',
    rationale:
      'Closing the 7-day cycle establishes accurate recovered capital totals and prevents unresolved stock carryover.',
  },
];

// ── Helper: Candidate Product Prioritization ──────────────────────────────────

/**
 * Scores and sorts products for recovery scheduling priority.
 */
function rankCandidateProducts(analyzedProducts) {
  const severityWeights = {
    Critical: 1000,
    High: 500,
    Medium: 200,
    Low: 50,
  };

  const classWeights = {
    critical_dead_stock: 400,
    at_risk: 300,
    slow_moving: 200,
    insufficient_data: 100,
    healthy: 10,
  };

  return [...analyzedProducts].sort((a, b) => {
    const sevA = severityWeights[a.severity] || 0;
    const sevB = severityWeights[b.severity] || 0;
    if (sevB !== sevA) return sevB - sevA;

    const clsA = classWeights[a.classification?.key] || 0;
    const clsB = classWeights[b.classification?.key] || 0;
    if (clsB !== clsA) return clsB - clsA;

    // Highest inventory cost value (capital tied up)
    if (b.inventoryCostValue !== a.inventoryCostValue) {
      return b.inventoryCostValue - a.inventoryCostValue;
    }

    // Risk score descending
    return (b.riskScore || 0) - (a.riskScore || 0);
  });
}

// ── Plan Generation Logic ─────────────────────────────────────────────────────

/**
 * Generates or regenerates a 7-day recovery plan.
 *
 * @param {object} options
 * @param {Date|string} [options.startDate] - Starting date for Day 1
 * @param {boolean} [options.preserveCompleted=true] - Preserve existing completed actions
 * @param {boolean} [options.forceReset=false] - If true, completely resets active plan
 * @param {Date} [options.referenceDate=new Date()]
 * @returns {Promise<object>} The active RecoveryPlan document
 */
export async function generateSevenDayRecoveryPlan(options = {}) {
  const {
    startDate: requestedStartDate,
    preserveCompleted = true,
    forceReset = false,
    referenceDate = new Date(),
    merchantId = null,
  } = options;

  const startUtc = requestedStartDate
    ? getUtcMidnight(requestedStartDate)
    : getUtcMidnight(referenceDate);

  const endUtc = new Date(startUtc);
  endUtc.setUTCDate(endUtc.getUTCDate() + 6); // 7-day inclusive window

  // Check for existing active plan
  const existingPlanQuery = { status: 'active' };
  if (merchantId) {
    existingPlanQuery.merchantId = merchantId;
  }
  const existingActivePlan = await RecoveryPlan.findOne(existingPlanQuery);

  // Map of completed actions to preserve by day (if requested and not forcing reset)
  const preservedActionsByDay = new Map();
  if (existingActivePlan && preserveCompleted && !forceReset) {
    for (const act of existingActivePlan.actions || []) {
      if (act.status === 'completed' || act.status === 'in_progress') {
        preservedActionsByDay.set(act.day, act);
      }
    }
  }

  // Fetch all physical inventory products from MongoDB
  const productFilter = merchantId ? { merchantId } : {};
  const products = await Product.find(productFilter).lean();

  // Filter to available stock
  const inStockProducts = products.filter(
    (p) => (Number(p.quantity ?? p.stockQuantity) || 0) > 0
  );

  // Analyze all products with Phase 6 dead stock engine
  const analyzedProducts = inStockProducts.map((p) => {
    const analysis = analyzeProduct(p, referenceDate);
    return {
      ...analysis,
      rawProduct: p,
    };
  });

  const rankedCandidates = rankCandidateProducts(analyzedProducts);

  const newActions = [];

  for (let day = 1; day <= 7; day++) {
    // 1. If an action for this day was already completed, preserve it
    if (preservedActionsByDay.has(day)) {
      const preserved = preservedActionsByDay.get(day);
      newActions.push({
        day,
        plannedActionDate: preserved.plannedActionDate,
        productId: preserved.productId,
        productName: preserved.productName,
        sku: preserved.sku,
        category: preserved.category,
        actionType: preserved.actionType,
        title: preserved.title,
        instructions: preserved.instructions,
        suggestedDiscountPercent: preserved.suggestedDiscountPercent,
        proposedSellingPrice: preserved.proposedSellingPrice,
        minimumSafePrice: preserved.minimumSafePrice,
        quantity: preserved.quantity,
        inventoryCostValue: preserved.inventoryCostValue,
        expectedRecoveryValue: preserved.expectedRecoveryValue,
        priority: preserved.priority,
        reasonCodes: preserved.reasonCodes,
        rationale: preserved.rationale,
        status: preserved.status,
        completedAt: preserved.completedAt,
        notes: preserved.notes,
      });
      continue;
    }

    // 2. Calculate planned action date for this day
    const actionDate = new Date(startUtc);
    actionDate.setUTCDate(actionDate.getUTCDate() + (day - 1));

    const strategy = DAY_STRATEGIES[day - 1];

    if (rankedCandidates.length === 0) {
      // No stock available in catalog: placeholder informative task
      newActions.push({
        day,
        plannedActionDate: actionDate,
        productId: new mongoose.Types.ObjectId(),
        productName: 'Inventory Catalog Empty',
        sku: 'CAT-EMPTY',
        category: 'General',
        actionType: 'audit_sales_data',
        title: `Day ${day}: Stock Reconciliation & Intake`,
        instructions:
          'No dead stock found. Conduct inventory intake or import updated product stock records.',
        suggestedDiscountPercent: 0,
        proposedSellingPrice: 0,
        minimumSafePrice: 0,
        quantity: 0,
        inventoryCostValue: 0,
        expectedRecoveryValue: 0,
        priority: 'low',
        reasonCodes: ['INVENTORY_EMPTY'],
        rationale: 'Catalog currently has zero stock records.',
        status: 'pending',
        notes: '',
      });
      continue;
    }

    // Assign candidate product: cycle through candidates if fewer than 7
    const candidateIndex = (day - 1) % rankedCandidates.length;
    const candidate = rankedCandidates[candidateIndex];
    const rawProd = candidate.rawProduct;

    // Financial calculations via Phase 7 logic
    let minimumSafePrice = 0;
    try {
      const floor = calculateMinimumPrice({
        purchaseCost: rawProd.purchaseCost,
        variableCostPerUnit: 0,
        constraintType: rawProd.minimumDesiredProfitPerUnit > 0 ? 'minimum_profit' : 'minimum_margin',
        minimumDesiredProfitPerUnit: rawProd.minimumDesiredProfitPerUnit || 0,
        minimumGrossMarginPercent: rawProd.minimumGrossMarginPercent || 15,
        currentSellingPrice: rawProd.sellingPrice,
      });
      minimumSafePrice = floor.minimumAcceptablePrice;
    } catch {
      minimumSafePrice = round2(rawProd.purchaseCost * 1.05);
    }

    // Run discount recommendation
    let discountRecommendation;
    try {
      discountRecommendation = await recommendDiscountForProduct({
        productId: rawProd._id,
        quantity: rawProd.quantity ?? rawProd.stockQuantity ?? 1,
      });
    } catch {
      discountRecommendation = null;
    }

    let finalActionType = strategy.actionType;
    let suggestedDiscount = 0;
    let proposedPrice = rawProd.sellingPrice;

    // Check discount feasibility
    const maxSafeDiscount = discountRecommendation?.profitFloor?.maximumSafeDiscountPercent ?? 0;
    const isDiscountAction =
      strategy.actionType === 'profit_safe_clearance' ||
      strategy.actionType === 'targeted_promotion';

    if (isDiscountAction) {
      if (maxSafeDiscount <= 0 || minimumSafePrice >= rawProd.sellingPrice) {
        // Zero safe discount capacity: fallback to non-discount merchandising action
        finalActionType = strategy.fallbackActionType;
        suggestedDiscount = 0;
        proposedPrice = rawProd.sellingPrice;
      } else {
        suggestedDiscount = discountRecommendation?.recommendation?.recommendedDiscountPercent ?? 0;
        // Never exceed max safe discount
        suggestedDiscount = Math.min(suggestedDiscount, maxSafeDiscount);
        proposedPrice = round2(rawProd.sellingPrice * (1 - suggestedDiscount / 100));
        // Hard financial safeguard: proposed price MUST be >= minimumSafePrice
        if (proposedPrice < minimumSafePrice) {
          proposedPrice = minimumSafePrice;
          suggestedDiscount = round2((1 - proposedPrice / rawProd.sellingPrice) * 100);
        }
      }
    } else {
      suggestedDiscount = 0;
      proposedPrice = rawProd.sellingPrice;
    }

    const qty = rawProd.quantity ?? rawProd.stockQuantity ?? 0;
    const costValue = round2(qty * rawProd.purchaseCost);
    // Conservative recovery model: 75% estimated absorption rate of proposed value
    const estimatedRecoveryValue = round2(qty * proposedPrice * 0.75);

    // Map severity to action priority
    let priority = 'medium';
    if (candidate.severity === 'Critical') priority = 'critical';
    else if (candidate.severity === 'High') priority = 'high';
    else if (candidate.severity === 'Low') priority = 'low';

    newActions.push({
      day,
      plannedActionDate: actionDate,
      productId: rawProd._id,
      productName: rawProd.name,
      sku: rawProd.sku,
      category: rawProd.category || 'General',
      actionType: finalActionType,
      title: `Day ${day}: ${strategy.title}`,
      instructions: `${strategy.instructions} Target Product: ${rawProd.name} (SKU: ${rawProd.sku}).`,
      suggestedDiscountPercent: suggestedDiscount,
      proposedSellingPrice: proposedPrice,
      minimumSafePrice,
      quantity: qty,
      inventoryCostValue: costValue,
      expectedRecoveryValue: estimatedRecoveryValue,
      priority,
      reasonCodes: candidate.reasonCodes || [],
      rationale: `${strategy.rationale} Classified as ${candidate.classification?.label || 'Dead Stock'} with ₹${costValue.toLocaleString('en-IN')} capital tied up.`,
      status: 'pending',
      notes: '',
    });
  }

  // Calculate totals
  const totalCostExposure = round2(
    newActions.reduce((sum, a) => sum + (Number(a.inventoryCostValue) || 0), 0)
  );
  const estimatedTotalRecoveryValue = round2(
    newActions.reduce((sum, a) => sum + (Number(a.expectedRecoveryValue) || 0), 0)
  );

  let targetRecoveryRate = 78;
  if (totalCostExposure > 0) {
    targetRecoveryRate = round2((estimatedTotalRecoveryValue / totalCostExposure) * 100);
  }

  // Save or update plan
  if (existingActivePlan) {
    if (forceReset) {
      existingActivePlan.status = 'archived';
      await existingActivePlan.save();

      const newPlan = new RecoveryPlan({
        merchantId: merchantId || null,
        planTitle: '7-Day Cash Recovery Action Plan',
        startDate: startUtc,
        endDate: endUtc,
        status: 'active',
        targetRecoveryRatePercent: targetRecoveryRate,
        totalCostExposure,
        estimatedTotalRecoveryValue,
        actions: newActions,
      });
      return await newPlan.save();
    } else {
      // Update existing active plan in place
      existingActivePlan.startDate = startUtc;
      existingActivePlan.endDate = endUtc;
      existingActivePlan.targetRecoveryRatePercent = targetRecoveryRate;
      existingActivePlan.totalCostExposure = totalCostExposure;
      existingActivePlan.estimatedTotalRecoveryValue = estimatedTotalRecoveryValue;
      existingActivePlan.actions = newActions;
      return await existingActivePlan.save();
    }
  }

  // No active plan existed
  const plan = new RecoveryPlan({
    merchantId: merchantId || null,
    planTitle: '7-Day Cash Recovery Action Plan',
    startDate: startUtc,
    endDate: endUtc,
    status: 'active',
    targetRecoveryRatePercent: targetRecoveryRate,
    totalCostExposure,
    estimatedTotalRecoveryValue,
    actions: newActions,
  });

  return await plan.save();
}

// ── Query Active Plan ─────────────────────────────────────────────────────────

/**
 * Retrieves the currently active 7-day recovery plan, with optional filters.
 * If no plan exists, generates one automatically.
 */
export async function getActiveRecoveryPlan(filters = {}, merchantId = null) {
  const query = { status: 'active' };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  let plan = await RecoveryPlan.findOne(query);

  if (!plan) {
    plan = await generateSevenDayRecoveryPlan({ merchantId });
  }

  const { day, status, priority } = filters;

  if (!day && !status && !priority) {
    return plan;
  }

  // Filter actions if specified
  const planObj = plan.toObject();
  let filteredActions = planObj.actions;

  if (day) {
    const dayNum = Number(day);
    filteredActions = filteredActions.filter((a) => a.day === dayNum);
  }

  if (status) {
    filteredActions = filteredActions.filter((a) => a.status === status);
  }

  if (priority) {
    filteredActions = filteredActions.filter((a) => a.priority === priority);
  }

  planObj.actions = filteredActions;
  return planObj;
}

// ── Plan Summary & Metrics ────────────────────────────────────────────────────

/**
 * Computes live recovery plan progress metrics.
 */
export async function getRecoveryPlanSummary(planId = null, merchantId = null) {
  let plan = null;
  if (planId && mongoose.Types.ObjectId.isValid(planId)) {
    const planQuery = { _id: planId };
    if (merchantId) planQuery.merchantId = merchantId;
    plan = await RecoveryPlan.findOne(planQuery);
  }

  if (!plan) {
    const activeQuery = { status: 'active' };
    if (merchantId) activeQuery.merchantId = merchantId;
    plan = await RecoveryPlan.findOne(activeQuery);
  }

  if (!plan) {
    plan = await generateSevenDayRecoveryPlan({ merchantId });
  }

  const actions = plan.actions || [];
  const totalActions = actions.length;

  let completedCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;
  let actualRecoveredValue = 0;

  const dailyBreakdown = [];

  for (let day = 1; day <= 7; day++) {
    const dayActions = actions.filter((a) => a.day === day);
    const dayCompleted = dayActions.filter((a) => a.status === 'completed').length;
    const dayPending = dayActions.filter((a) => a.status === 'pending').length;
    const dayInProgress = dayActions.filter((a) => a.status === 'in_progress').length;
    const daySkipped = dayActions.filter((a) => a.status === 'skipped').length;

    dailyBreakdown.push({
      day,
      totalActions: dayActions.length,
      completed: dayCompleted,
      inProgress: dayInProgress,
      pending: dayPending,
      skipped: daySkipped,
      status: dayCompleted > 0 && dayCompleted === dayActions.length ? 'completed' : 'active',
    });
  }

  for (const act of actions) {
    if (act.status === 'completed') {
      completedCount++;
      actualRecoveredValue += Number(act.expectedRecoveryValue) || 0;
    } else if (act.status === 'in_progress') {
      inProgressCount++;
    } else if (act.status === 'skipped') {
      skippedCount++;
    } else {
      pendingCount++;
    }
  }

  const progressPercentage =
    totalActions > 0 ? round2((completedCount / totalActions) * 100) : 0;

  // Days remaining
  const now = new Date();
  const endDate = new Date(plan.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    planId: plan._id,
    planTitle: plan.planTitle,
    status: plan.status,
    startDate: plan.startDate,
    endDate: plan.endDate,
    daysRemaining,
    totalActions,
    completedActions: completedCount,
    inProgressActions: inProgressCount,
    pendingActions: pendingCount,
    skippedActions: skippedCount,
    progressPercentage,
    totalCostExposure: round2(plan.totalCostExposure),
    estimatedTotalRecoveryValue: round2(plan.estimatedTotalRecoveryValue),
    actualRecoveredValue: round2(actualRecoveredValue),
    targetRecoveryRatePercent: plan.targetRecoveryRatePercent,
    dailyBreakdown,
  };
}

// ── Update Action Status ──────────────────────────────────────────────────────

/**
 * Updates an action's execution status (e.g. pending -> in_progress -> completed/skipped)
 * and records completion timestamp and notes.
 */
export async function updateActionStatus({ actionId, status, notes, merchantId = null }) {
  if (!actionId || !mongoose.Types.ObjectId.isValid(actionId)) {
    throw new Error('Valid action ID is required');
  }

  const query = { 'actions._id': actionId };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  const plan = await RecoveryPlan.findOne(query);
  if (!plan) {
    return null;
  }

  const action = plan.actions.id(actionId);
  if (!action) {
    return null;
  }

  action.status = status;

  if (status === 'completed') {
    if (!action.completedAt) {
      action.completedAt = new Date();
    }
  } else {
    action.completedAt = null;
  }

  if (notes !== undefined && notes !== null) {
    action.notes = String(notes).trim();
  }

  // Check if all actions are completed
  const allCompleted = plan.actions.every(
    (a) => a.status === 'completed' || a.status === 'skipped'
  );
  if (allCompleted) {
    plan.status = 'completed';
  } else if (plan.status === 'completed') {
    plan.status = 'active';
  }

  await plan.save();

  return {
    action: action.toObject(),
    planStatus: plan.status,
  };
}
