/**
 * StockSaathi AI — Dead Stock & Risk Scoring Configuration (Phase 6)
 *
 * Centralized, configurable thresholds, weights, and labels for:
 * - Stock-age classification
 * - Deterministic risk scoring
 * - Risk severity bands
 * - Reason codes and explanations
 */

export const STOCK_AGE_THRESHOLDS = {
  HEALTHY: {
    key: 'healthy',
    label: 'Healthy',
    minDays: 0,
    maxDays: 29,
    description: 'Fewer than 30 days since last sale. Active sales velocity.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#10b981',
  },
  SLOW_MOVING: {
    key: 'slow_moving',
    label: 'Slow Moving',
    minDays: 30,
    maxDays: 59,
    description: '30 to 59 days since last sale. Demand is declining; requires monitoring.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#f59e0b',
  },
  AT_RISK: {
    key: 'at_risk',
    label: 'At Risk',
    minDays: 60,
    maxDays: 90,
    description: '60 to 90 days since last sale. High probability of becoming dead stock without intervention.',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
  },
  CRITICAL_DEAD_STOCK: {
    key: 'critical_dead_stock',
    label: 'Critical Dead Stock',
    minDays: 91,
    maxDays: Infinity,
    description: 'More than 90 days without sales. Severe cash lockup and obsolescence risk.',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    color: '#ef4444',
  },
  INSUFFICIENT_DATA: {
    key: 'insufficient_data',
    label: 'Insufficient sales data',
    minDays: null,
    maxDays: null,
    description: 'No reliable last-sale record available. Stock age cannot be determined.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    color: '#64748b',
  },
};

export const RISK_SEVERITY_BANDS = {
  LOW: {
    level: 'Low',
    minScore: 0,
    maxScore: 29,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#3b82f6',
  },
  MEDIUM: {
    level: 'Medium',
    minScore: 30,
    maxScore: 59,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#f59e0b',
  },
  HIGH: {
    level: 'High',
    minScore: 60,
    maxScore: 79,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
  },
  CRITICAL: {
    level: 'Critical',
    minScore: 80,
    maxScore: 100,
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    color: '#ef4444',
  },
};

export const SCORING_WEIGHTS = {
  // Maximum component points (total max = 100)
  MAX_AGE_POINTS: 55,
  MAX_CAPITAL_POINTS: 25,
  MAX_QUANTITY_POINTS: 10,
  MAX_EXPIRY_POINTS: 10,

  // Capital tiers (INR)
  CAPITAL_TIERS: [
    { threshold: 50000, points: 25 },
    { threshold: 20000, points: 17 },
    { threshold: 5000, points: 10 },
    { threshold: 0, points: 5 },
  ],

  // Quantity tiers
  QUANTITY_TIERS: [
    { threshold: 50, points: 10 },
    { threshold: 20, points: 8 },
    { threshold: 5, points: 5 },
    { threshold: 0, points: 2 },
  ],
};

export const REASON_CODES = {
  HEALTHY_RECENCY: {
    code: 'HEALTHY_RECENCY',
    message: 'Recent sale recorded within the past 30 days.',
  },
  MODERATE_STAGNANCY: {
    code: 'MODERATE_STAGNANCY',
    message: '30–59 days since last transaction; velocity is slowing.',
  },
  ELEVATED_STAGNANCY: {
    code: 'ELEVATED_STAGNANCY',
    message: '60–90 days without transactions; nearing dead stock threshold.',
  },
  CRITICAL_STAGNANCY: {
    code: 'CRITICAL_STAGNANCY',
    message: 'Over 90 days without transactions; categorized as dead stock.',
  },
  HIGH_CAPITAL_EXPOSURE: {
    code: 'HIGH_CAPITAL_EXPOSURE',
    message: 'Substantial capital tied up in unsold units (over ₹20,000).',
  },
  VERY_HIGH_CAPITAL_EXPOSURE: {
    code: 'VERY_HIGH_CAPITAL_EXPOSURE',
    message: 'Critical capital tied up in unsold units (over ₹50,000).',
  },
  HIGH_QUANTITY_HELD: {
    code: 'HIGH_QUANTITY_HELD',
    message: 'Large volume of physical stock held (> 20 units).',
  },
  APPROACHING_EXPIRY: {
    code: 'APPROACHING_EXPIRY',
    message: 'Product expires within the next 90 days.',
  },
  CRITICAL_EXPIRY: {
    code: 'CRITICAL_EXPIRY',
    message: 'Product expires within 30 days or is already past expiration.',
  },
  NO_LAST_SALE_DATE: {
    code: 'NO_LAST_SALE_DATE',
    message: 'Missing lastSaleDate in database records. Stock age cannot be verified.',
  },
  FUTURE_LAST_SALE_DATE: {
    code: 'FUTURE_LAST_SALE_DATE',
    message: 'Data quality issue: lastSaleDate is set in the future.',
  },
  INVALID_LAST_SALE_DATE: {
    code: 'INVALID_LAST_SALE_DATE',
    message: 'Data quality issue: lastSaleDate contains an unparseable timestamp.',
  },
  ZERO_QUANTITY: {
    code: 'ZERO_QUANTITY',
    message: 'Zero stock units currently held; capital exposure is zero.',
  },
  VELOCITY_UNSTANDARDIZED: {
    code: 'VELOCITY_UNSTANDARDIZED',
    message: 'Measurement period for unitsSoldDuringPeriod is undefined; velocity not factored.',
  },
};
