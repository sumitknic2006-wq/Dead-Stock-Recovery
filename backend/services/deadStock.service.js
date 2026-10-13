/**
 * StockSaathi AI — Dead Stock Detection & Risk Scoring Service (Phase 6)
 *
 * Deterministic, explainable business logic for:
 * 1. Stock-age calculation (timezone-safe UTC midnight diff)
 * 2. Age-based stock classification (Healthy, Slow Moving, At Risk, Critical Dead Stock, Insufficient Data)
 * 3. Transparent risk scoring (0–100 scale with component breakdowns)
 * 4. Rule-based actionable recommendations
 * 5. Data completeness auditing
 *
 * All formulas use verified physical product attributes from MongoDB.
 */

import Product from '../models/Product.model.js';
import {
  STOCK_AGE_THRESHOLDS,
  RISK_SEVERITY_BANDS,
  SCORING_WEIGHTS,
  REASON_CODES,
} from '../config/deadStock.config.js';

// ─── 1. Date & Stock Age Calculation ──────────────────────────────────────────

/**
 * Normalises a date to UTC midnight (00:00:00.000Z) to prevent off-by-one errors
 * caused by local timezones or differing times of day.
 *
 * @param {Date|string|number} dateInput
 * @returns {Date|null}
 */
export function getUtcMidnight(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Calculates calendar days elapsed between pastDate and referenceDate.
 *
 * @param {Date|string|null} lastSaleDate
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   isValid: boolean,
 *   daysSinceLastSale: number|null,
 *   status: 'VALID'|'MISSING_DATE'|'FUTURE_DATE'|'INVALID_DATE',
 *   message: string
 * }}
 */
export function calculateDaysSinceLastSale(lastSaleDate, referenceDate = new Date()) {
  if (lastSaleDate === null || lastSaleDate === undefined || lastSaleDate === '') {
    return {
      isValid: false,
      daysSinceLastSale: null,
      status: 'MISSING_DATE',
      message: 'No last-sale timestamp recorded in database.',
    };
  }

  const past = getUtcMidnight(lastSaleDate);
  if (!past) {
    return {
      isValid: false,
      daysSinceLastSale: null,
      status: 'INVALID_DATE',
      message: 'lastSaleDate could not be parsed into a valid calendar date.',
    };
  }

  const ref = getUtcMidnight(referenceDate);
  const diffMs = ref.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      isValid: false,
      daysSinceLastSale: null,
      status: 'FUTURE_DATE',
      message: `lastSaleDate is in the future (${Math.abs(diffDays)} days ahead of reference date).`,
    };
  }

  return {
    isValid: true,
    daysSinceLastSale: diffDays,
    status: 'VALID',
    message: `${diffDays} days elapsed since last recorded transaction.`,
  };
}

// ─── 2. Stock Age Classification ──────────────────────────────────────────────

/**
 * Classifies an item into one of the 4 age categories or Insufficient Data.
 *
 * Precise default boundaries:
 * - Healthy: 0–29 days
 * - Slow Moving: 30–59 days
 * - At Risk: 60–90 days
 * - Critical Dead Stock: > 90 days (91+)
 * - Insufficient Data: Missing or invalid sales history
 *
 * @param {{ isValid: boolean, daysSinceLastSale: number|null, status: string }} stockAgeResult
 * @returns {{ key: string, label: string, description: string, badgeClass: string, color: string }}
 */
export function classifyStock(stockAgeResult) {
  if (!stockAgeResult || !stockAgeResult.isValid || stockAgeResult.daysSinceLastSale === null) {
    return { ...STOCK_AGE_THRESHOLDS.INSUFFICIENT_DATA };
  }

  const days = stockAgeResult.daysSinceLastSale;

  if (days <= 29) {
    return { ...STOCK_AGE_THRESHOLDS.HEALTHY };
  } else if (days <= 59) {
    return { ...STOCK_AGE_THRESHOLDS.SLOW_MOVING };
  } else if (days <= 90) {
    return { ...STOCK_AGE_THRESHOLDS.AT_RISK };
  } else {
    return { ...STOCK_AGE_THRESHOLDS.CRITICAL_DEAD_STOCK };
  }
}

// ─── 3. Deterministic Risk Scoring (0–100) ────────────────────────────────────

/**
 * Computes an explainable, deterministic risk score from 0 to 100.
 *
 * Components:
 * 1. Stock Age (0–55 pts): Primary evidence based on days since last sale.
 * 2. Capital Exposure (0–25 pts): Capital locked up = purchaseCost × quantity.
 * 3. Physical Stagnancy (0–10 pts): Unsold physical unit volume held.
 * 4. Expiry Exposure (0–10 pts): Impending product expiration if tracked.
 *
 * When lastSaleDate is missing, Age points = 0, isProvisional = true,
 * and explanation highlights insufficient data.
 *
 * @param {object} product
 * @param {{ isValid: boolean, daysSinceLastSale: number|null, status: string }} stockAgeResult
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   score: number,
 *   severity: 'Low'|'Medium'|'High'|'Critical',
 *   isProvisional: boolean,
 *   componentScores: { age: number, capital: number, quantity: number, expiry: number },
 *   reasonCodes: string[],
 *   explanations: string[]
 * }}
 */
export function calculateRiskScore(product, stockAgeResult, referenceDate = new Date()) {
  const quantity = Math.max(0, Number(product.quantity) || 0);
  const purchaseCost = Math.max(0, Number(product.purchaseCost) || 0);
  const inventoryCostValue = parseFloat((purchaseCost * quantity).toFixed(2));

  // If quantity is 0, zero capital exposure and minimal risk
  if (quantity === 0) {
    return {
      score: 0,
      severity: RISK_SEVERITY_BANDS.LOW.level,
      isProvisional: false,
      componentScores: { age: 0, capital: 0, quantity: 0, expiry: 0 },
      reasonCodes: [REASON_CODES.ZERO_QUANTITY.code],
      explanations: [REASON_CODES.ZERO_QUANTITY.message],
    };
  }

  let ageScore = 0;
  let isProvisional = false;
  const reasonCodes = [];
  const explanations = [];

  // 1. Age Contribution (Max 55 pts)
  if (!stockAgeResult || !stockAgeResult.isValid || stockAgeResult.daysSinceLastSale === null) {
    isProvisional = true;
    ageScore = 0;
    if (stockAgeResult?.status === 'FUTURE_DATE') {
      reasonCodes.push(REASON_CODES.FUTURE_LAST_SALE_DATE.code);
      explanations.push(REASON_CODES.FUTURE_LAST_SALE_DATE.message);
    } else if (stockAgeResult?.status === 'INVALID_DATE') {
      reasonCodes.push(REASON_CODES.INVALID_LAST_SALE_DATE.code);
      explanations.push(REASON_CODES.INVALID_LAST_SALE_DATE.message);
    } else {
      reasonCodes.push(REASON_CODES.NO_LAST_SALE_DATE.code);
      explanations.push(REASON_CODES.NO_LAST_SALE_DATE.message);
    }
  } else {
    const days = stockAgeResult.daysSinceLastSale;
    if (days <= 29) {
      ageScore = Math.round((days / 30) * 15);
      reasonCodes.push(REASON_CODES.HEALTHY_RECENCY.code);
      explanations.push(REASON_CODES.HEALTHY_RECENCY.message);
    } else if (days <= 59) {
      ageScore = 15 + Math.round(((days - 30) / 30) * 15);
      reasonCodes.push(REASON_CODES.MODERATE_STAGNANCY.code);
      explanations.push(REASON_CODES.MODERATE_STAGNANCY.message);
    } else if (days <= 90) {
      ageScore = 30 + Math.round(((days - 60) / 30) * 15);
      reasonCodes.push(REASON_CODES.ELEVATED_STAGNANCY.code);
      explanations.push(REASON_CODES.ELEVATED_STAGNANCY.message);
    } else {
      ageScore = 45 + Math.min(10, Math.round(((days - 90) / 90) * 10));
      reasonCodes.push(REASON_CODES.CRITICAL_STAGNANCY.code);
      explanations.push(REASON_CODES.CRITICAL_STAGNANCY.message);
    }
  }

  // 2. Capital Exposure (Max 25 pts)
  let capitalScore = 0;
  for (const tier of SCORING_WEIGHTS.CAPITAL_TIERS) {
    if (inventoryCostValue >= tier.threshold) {
      capitalScore = tier.points;
      break;
    }
  }
  if (inventoryCostValue >= 50000) {
    reasonCodes.push(REASON_CODES.VERY_HIGH_CAPITAL_EXPOSURE.code);
    explanations.push(REASON_CODES.VERY_HIGH_CAPITAL_EXPOSURE.message);
  } else if (inventoryCostValue >= 20000) {
    reasonCodes.push(REASON_CODES.HIGH_CAPITAL_EXPOSURE.code);
    explanations.push(REASON_CODES.HIGH_CAPITAL_EXPOSURE.message);
  }

  // 3. Physical Stagnancy / Quantity Held (Max 10 pts)
  let quantityScore = 0;
  for (const tier of SCORING_WEIGHTS.QUANTITY_TIERS) {
    if (quantity >= tier.threshold) {
      quantityScore = tier.points;
      break;
    }
  }
  if (quantity > 20) {
    reasonCodes.push(REASON_CODES.HIGH_QUANTITY_HELD.code);
    explanations.push(REASON_CODES.HIGH_QUANTITY_HELD.message);
  }

  // 4. Impending Expiry Risk (Max 10 pts)
  let expiryScore = 0;
  if (product.expiryDate) {
    const exp = getUtcMidnight(product.expiryDate);
    const ref = getUtcMidnight(referenceDate);
    if (exp && ref) {
      const daysUntilExp = Math.floor((exp.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExp <= 0) {
        expiryScore = 10;
        reasonCodes.push(REASON_CODES.CRITICAL_EXPIRY.code);
        explanations.push('Product is already past expiration date.');
      } else if (daysUntilExp <= 30) {
        expiryScore = 8;
        reasonCodes.push(REASON_CODES.CRITICAL_EXPIRY.code);
        explanations.push(REASON_CODES.CRITICAL_EXPIRY.message);
      } else if (daysUntilExp <= 90) {
        expiryScore = 5;
        reasonCodes.push(REASON_CODES.APPROACHING_EXPIRY.code);
        explanations.push(REASON_CODES.APPROACHING_EXPIRY.message);
      }
    }
  }

  // Notice about unitsSoldDuringPeriod (not factoring into score without defined period)
  if (product.unitsSoldDuringPeriod !== null && product.unitsSoldDuringPeriod !== undefined) {
    reasonCodes.push(REASON_CODES.VELOCITY_UNSTANDARDIZED.code);
    explanations.push(REASON_CODES.VELOCITY_UNSTANDARDIZED.message);
  }

  const rawScore = ageScore + capitalScore + quantityScore + expiryScore;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Severity resolution
  let severity = RISK_SEVERITY_BANDS.LOW.level;
  if (score >= RISK_SEVERITY_BANDS.CRITICAL.minScore) {
    severity = RISK_SEVERITY_BANDS.CRITICAL.level;
  } else if (score >= RISK_SEVERITY_BANDS.HIGH.minScore) {
    severity = RISK_SEVERITY_BANDS.HIGH.level;
  } else if (score >= RISK_SEVERITY_BANDS.MEDIUM.minScore) {
    severity = RISK_SEVERITY_BANDS.MEDIUM.level;
  }

  return {
    score,
    severity,
    isProvisional,
    componentScores: {
      age: ageScore,
      capital: capitalScore,
      quantity: quantityScore,
      expiry: expiryScore,
    },
    reasonCodes,
    explanations,
  };
}

// ─── 4. Explainable Recommendations ───────────────────────────────────────────

/**
 * Returns rule-based actionable next steps based strictly on available evidence.
 *
 * Rules:
 * - Healthy: Continue regular monitoring. Avoid unnecessary markdown.
 * - Slow Moving: Review sales channels, consider feature placement or bundled pairing.
 * - At Risk: Investigate root cause, evaluate promotional sales channels.
 * - Critical Dead Stock: High priority liquidation review. Check condition and explore wholesale/clearance options.
 * - Insufficient Data: Request retailer audit of last transaction record.
 *
 * Guarantees:
 * - Never guarantees sales.
 * - Never recommends selling below purchase cost.
 * - Does not recommend supplier return unless condition/supplier is verified.
 *
 * @param {object} classification
 * @param {number} riskScore
 * @param {object} product
 * @param {object} stockAgeResult
 * @returns {Array<{ title: string, description: string, priority: 'Routine'|'Medium'|'High'|'Urgent', rationale: string }>}
 */
export function generateRecommendations(classification, riskScore, product, stockAgeResult) {
  const recommendations = [];
  const inventoryCostValue = (product.purchaseCost || 0) * (product.quantity || 0);

  if (classification.key === 'insufficient_data') {
    recommendations.push({
      title: 'Audit Sales Records',
      description: 'Record the most recent transaction date for this SKU in StockSaathi to enable automated age tracking.',
      priority: 'High',
      rationale: 'Stock age and liquidation urgency cannot be calculated without a valid lastSaleDate.',
    });
    if (inventoryCostValue >= 20000) {
      recommendations.push({
        title: 'Monitor Financial Exposure',
        description: `This product has ₹${inventoryCostValue.toLocaleString('en-IN')} in inventory cost value. Prioritize verification of whether physical units are actively moving.`,
        priority: 'Medium',
        rationale: 'High capital investment warrants manual verification even when transaction timestamps are absent.',
      });
    }
    return recommendations;
  }

  switch (classification.key) {
    case 'healthy':
      recommendations.push({
        title: 'Maintain Current Merchandising',
        description: 'Continue normal sales monitoring. Avoid price cuts or unprompted discounting.',
        priority: 'Routine',
        rationale: `Last sold ${stockAgeResult.daysSinceLastSale} days ago. Healthy turnover indicates active consumer interest at current listed price.`,
      });
      break;

    case 'slow_moving':
      recommendations.push({
        title: 'Enhance Shelf & Online Visibility',
        description: 'Reposition display towards front of counter or feature prominently in digital catalog.',
        priority: 'Medium',
        rationale: `Product has been idle for ${stockAgeResult.daysSinceLastSale} days. Merchandising visibility can revitalize demand before margin erosion.`,
      });
      if (product.quantity > 20) {
        recommendations.push({
          title: 'Explore Bundled Pairing',
          description: 'Consider pairing complementary accessories with higher-velocity products without cutting standalone retail price.',
          priority: 'Medium',
          rationale: 'High held volume benefits from basket-building strategies.',
        });
      }
      break;

    case 'at_risk':
      recommendations.push({
        title: 'Initiate Promotional Outreach',
        description: 'Review demand drivers and evaluate customer broadcast or targeted incentive campaigns.',
        priority: 'High',
        rationale: `${stockAgeResult.daysSinceLastSale} days since last transaction. Approaching the 90-day dead stock boundary.`,
      });
      if (product.condition && product.condition !== 'new') {
        recommendations.push({
          title: 'Inspect Stock Condition',
          description: `Verify packaging and physical condition (current grade: ${product.condition}) to ensure retail viability.`,
          priority: 'High',
          rationale: 'Non-new merchandise experiences accelerated value depreciation over time.',
        });
      }
      break;

    case 'critical_dead_stock':
      recommendations.push({
        title: 'Prioritize Liquidation Action',
        description: 'Conduct urgent stock review. Formulate a targeted clearance plan to unlock held capital.',
        priority: 'Urgent',
        rationale: `Inactive for ${stockAgeResult.daysSinceLastSale} days (>90d threshold). ₹${inventoryCostValue.toLocaleString('en-IN')} capital is currently stagnant.`,
      });
      if (product.supplierName) {
        recommendations.push({
          title: 'Review Supplier Terms',
          description: `Check supplier agreement with "${product.supplierName}" to determine whether return-to-vendor (RTV) or buyback credits are permitted.`,
          priority: 'Medium',
          rationale: 'Direct supplier credit or exchange avoids retail markdown losses where contracts allow.',
        });
      }
      if (product.expiryDate) {
        recommendations.push({
          title: 'Check Impending Expiration',
          description: 'Inspect product expiration dates and expedite liquidation before goods become unsellable.',
          priority: 'Urgent',
          rationale: 'Perishable or battery-bearing inventory faces total write-off upon expiration.',
        });
      }
      break;
  }

  return recommendations;
}

// ─── 5. Data Completeness Auditor ─────────────────────────────────────────────

/**
 * Assesses data fidelity of a product record.
 *
 * @param {object} product
 * @returns {{
 *   hasLastSaleDate: boolean,
 *   hasUnitsSold: boolean,
 *   hasCostPrice: boolean,
 *   hasSellingPrice: boolean,
 *   hasSupplier: boolean,
 *   hasCondition: boolean,
 *   completenessScore: number
 * }}
 */
export function auditDataCompleteness(product) {
  const checks = {
    hasLastSaleDate: Boolean(product.lastSaleDate),
    hasUnitsSold: product.unitsSoldDuringPeriod !== null && product.unitsSoldDuringPeriod !== undefined,
    hasCostPrice: product.purchaseCost !== null && product.purchaseCost !== undefined && !isNaN(product.purchaseCost),
    hasSellingPrice: product.sellingPrice !== null && product.sellingPrice !== undefined && !isNaN(product.sellingPrice),
    hasSupplier: Boolean(product.supplierName && product.supplierName.trim()),
    hasCondition: Boolean(product.condition),
  };

  const trueCount = Object.values(checks).filter(Boolean).length;
  const completenessScore = Math.round((trueCount / Object.keys(checks).length) * 100);

  return {
    ...checks,
    completenessScore,
  };
}

// ─── 6. Comprehensive Product Analyzer ────────────────────────────────────────

/**
 * Analyzes a single Product record and returns a standardized, explainable result.
 *
 * @param {object} product - Mongoose document or plain object
 * @param {Date} [referenceDate=new Date()]
 * @returns {object}
 */
export function analyzeProduct(product, referenceDate = new Date()) {
  const rawObj = product.toObject ? product.toObject({ virtuals: true }) : { ...product };

  const stockAgeResult = calculateDaysSinceLastSale(rawObj.lastSaleDate, referenceDate);
  const classification = classifyStock(stockAgeResult);
  const riskAnalysis = calculateRiskScore(rawObj, stockAgeResult, referenceDate);
  const recommendations = generateRecommendations(classification, riskAnalysis.score, rawObj, stockAgeResult);
  const completeness = auditDataCompleteness(rawObj);

  // Financial calculations
  const qty = Math.max(0, Number(rawObj.quantity) || 0);
  const cost = Math.max(0, Number(rawObj.purchaseCost) || 0);
  const price = Math.max(0, Number(rawObj.sellingPrice) || 0);

  const inventoryCostValue = parseFloat((cost * qty).toFixed(2));
  const potentialSalesValue = parseFloat((price * qty).toFixed(2));
  const estimatedGrossProfit = parseFloat(((price - cost) * qty).toFixed(2));
  const grossMarginPercent = price > 0 ? parseFloat((((price - cost) / price) * 100).toFixed(2)) : 0;

  return {
    productId: rawObj._id?.toString() || rawObj.id || null,
    name: rawObj.name,
    sku: rawObj.sku,
    category: rawObj.category,
    quantity: qty,
    purchaseCost: cost,
    sellingPrice: price,
    inventoryCostValue,
    potentialSalesValue,
    estimatedGrossProfit,
    grossMarginPercent,
    lastSaleDate: rawObj.lastSaleDate || null,
    expiryDate: rawObj.expiryDate || null,
    dateAdded: rawObj.dateAdded || null,
    supplierName: rawObj.supplierName || null,
    condition: rawObj.condition || 'new',
    unitsSoldDuringPeriod: rawObj.unitsSoldDuringPeriod ?? null,

    // Age & Classification
    daysSinceLastSale: stockAgeResult.daysSinceLastSale,
    stockAgeStatus: stockAgeResult.status,
    stockAgeMessage: stockAgeResult.message,
    classification: {
      key: classification.key,
      label: classification.label,
      description: classification.description,
      badgeClass: classification.badgeClass,
      color: classification.color,
    },

    // Risk Scoring
    riskScore: riskAnalysis.score,
    severity: riskAnalysis.severity,
    isProvisional: riskAnalysis.isProvisional,
    componentScores: riskAnalysis.componentScores,
    reasonCodes: riskAnalysis.reasonCodes,
    explanations: riskAnalysis.explanations,

    // Actions & Completeness
    recommendations,
    dataCompleteness: completeness,
  };
}

// ─── 7. Database Query & Paginated Analysis ───────────────────────────────────

/**
 * Queries MongoDB for products matching criteria, calculates analysis on each,
 * and supports sorting and pagination.
 *
 * @param {object} params
 * @param {string} [params.search]
 * @param {string} [params.category]
 * @param {string} [params.classification] - healthy | slow_moving | at_risk | critical_dead_stock | insufficient_data
 * @param {string} [params.severity] - Low | Medium | High | Critical
 * @param {string} [params.sortBy='daysSinceLastSale'] - daysSinceLastSale | riskScore | inventoryCostValue | quantity | name
 * @param {string} [params.order='desc'] - asc | desc
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<{
 *   data: object[],
 *   pagination: { total: number, page: number, limit: number, totalPages: number },
 *   summary: object
 * }>}
 */
export async function getDeadStockAnalysis(params = {}, referenceDate = new Date(), merchantId = null) {
  const {
    search,
    category,
    classification,
    severity,
    sortBy = 'daysSinceLastSale',
    order = 'desc',
    page = 1,
    limit = 20,
  } = params;

  // Build MongoDB base filter
  const filter = {};
  if (merchantId) {
    filter.merchantId = merchantId;
  }
  if (category && category.trim()) {
    filter.category = new RegExp(`^${category.trim()}$`, 'i');
  }

  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { sku: new RegExp(term, 'i') },
    ];
  }

  // Fetch all candidate records matching filter
  const rawProducts = await Product.find(filter).lean();

  // Run deterministic analysis on each
  let analyzed = rawProducts.map((p) => analyzeProduct(p, referenceDate));

  // Apply in-memory filters for virtual/computed fields
  if (classification && classification.trim()) {
    const targetKey = classification.trim().toLowerCase();
    analyzed = analyzed.filter((item) => item.classification.key === targetKey);
  }

  if (severity && severity.trim()) {
    const targetSev = severity.trim().toLowerCase();
    analyzed = analyzed.filter((item) => item.severity.toLowerCase() === targetSev);
  }

  // Sort
  const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
  analyzed.sort((a, b) => {
    let valA;
    let valB;

    switch (sortBy) {
      case 'daysSinceLastSale':
        // Nulls (insufficient data) sorted to end in desc, or start in asc
        valA = a.daysSinceLastSale !== null ? a.daysSinceLastSale : -1;
        valB = b.daysSinceLastSale !== null ? b.daysSinceLastSale : -1;
        break;
      case 'riskScore':
        valA = a.riskScore;
        valB = b.riskScore;
        break;
      case 'inventoryCostValue':
        valA = a.inventoryCostValue;
        valB = b.inventoryCostValue;
        break;
      case 'quantity':
        valA = a.quantity;
        valB = b.quantity;
        break;
      case 'name':
        return sortDirection * a.name.localeCompare(b.name);
      default:
        valA = a.daysSinceLastSale !== null ? a.daysSinceLastSale : -1;
        valB = b.daysSinceLastSale !== null ? b.daysSinceLastSale : -1;
        break;
    }

    if (valA < valB) return -1 * sortDirection;
    if (valA > valB) return 1 * sortDirection;
    return 0;
  });

  // Pagination
  const total = analyzed.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const pagedData = analyzed.slice(startIndex, startIndex + parsedLimit);

  return {
    data: pagedData,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
    },
  };
}

// ─── 8. Aggregated Dead Stock Summary ─────────────────────────────────────────

/**
 * Returns aggregated portfolio metrics across all products in MongoDB:
 * - Product counts & inventory cost by classification
 * - Critical dead stock total capital tied up
 * - Severity counts (Low, Medium, High, Critical)
 * - Top 6 priority dead stock items (for Dashboard display)
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<object>}
 */
export async function getDeadStockSummary(referenceDate = new Date(), merchantId = null) {
  const query = merchantId ? { merchantId } : {};
  const allProducts = await Product.find(query).lean();
  const analyzed = allProducts.map((p) => analyzeProduct(p, referenceDate));

  const initialSummary = {
    totalProducts: analyzed.length,
    totalUnits: 0,
    totalInventoryCostValue: 0,
    totalPotentialSalesValue: 0,
    classifications: {
      healthy: { count: 0, costValue: 0, units: 0 },
      slow_moving: { count: 0, costValue: 0, units: 0 },
      at_risk: { count: 0, costValue: 0, units: 0 },
      critical_dead_stock: { count: 0, costValue: 0, units: 0 },
      insufficient_data: { count: 0, costValue: 0, units: 0 },
    },
    severities: {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    },
    deadStockTotalCostValue: 0,
    deadStockTotalUnits: 0,
    atRiskTotalCostValue: 0,
  };

  for (const item of analyzed) {
    initialSummary.totalUnits += item.quantity;
    initialSummary.totalInventoryCostValue += item.inventoryCostValue;
    initialSummary.totalPotentialSalesValue += item.potentialSalesValue;

    const classKey = item.classification.key;
    if (initialSummary.classifications[classKey]) {
      initialSummary.classifications[classKey].count += 1;
      initialSummary.classifications[classKey].costValue += item.inventoryCostValue;
      initialSummary.classifications[classKey].units += item.quantity;
    }

    if (initialSummary.severities[item.severity] !== undefined) {
      initialSummary.severities[item.severity] += 1;
    }

    if (classKey === 'critical_dead_stock') {
      initialSummary.deadStockTotalCostValue += item.inventoryCostValue;
      initialSummary.deadStockTotalUnits += item.quantity;
    } else if (classKey === 'at_risk') {
      initialSummary.atRiskTotalCostValue += item.inventoryCostValue;
    }
  }

  // Format monetary figures to 2 decimal places
  initialSummary.totalInventoryCostValue = parseFloat(initialSummary.totalInventoryCostValue.toFixed(2));
  initialSummary.totalPotentialSalesValue = parseFloat(initialSummary.totalPotentialSalesValue.toFixed(2));
  initialSummary.deadStockTotalCostValue = parseFloat(initialSummary.deadStockTotalCostValue.toFixed(2));
  initialSummary.atRiskTotalCostValue = parseFloat(initialSummary.atRiskTotalCostValue.toFixed(2));

  for (const key of Object.keys(initialSummary.classifications)) {
    initialSummary.classifications[key].costValue = parseFloat(
      initialSummary.classifications[key].costValue.toFixed(2)
    );
  }

  // Top 6 priority dead stock items (ranked by critical dead stock / at risk holding cost)
  const priorityItems = analyzed
    .filter((p) => p.classification.key === 'critical_dead_stock' || p.classification.key === 'at_risk')
    .sort((a, b) => b.inventoryCostValue - a.inventoryCostValue)
    .slice(0, 6);

  return {
    summary: initialSummary,
    topPriorityItems: priorityItems,
  };
}
