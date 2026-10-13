/**
 * StockSaathi AI — Recovery Plan Mongoose Model (Phase 8)
 *
 * Persists 7-Day Dead Stock Recovery Action Plans, daily scheduled action items,
 * and live progress tracking with financial safeguards.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const RecoveryActionSchema = new Schema(
  {
    day: {
      type: Number,
      required: [true, 'Recovery day (1–7) is required'],
      min: [1, 'Day must be between 1 and 7'],
      max: [7, 'Day must be between 1 and 7'],
    },
    plannedActionDate: {
      type: Date,
      required: [true, 'Planned action date is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Associated product ID is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
      maxlength: 200,
    },
    sku: {
      type: String,
      required: [true, 'SKU snapshot is required'],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    actionType: {
      type: String,
      required: [true, 'Action type is required'],
      enum: {
        values: [
          'audit_sales_data',
          'merchandising_display',
          'bundle_compatible',
          'targeted_promotion',
          'profit_safe_clearance',
          'reseller_outreach',
          'final_review_reallocate',
        ],
        message: 'Invalid actionType value',
      },
    },
    title: {
      type: String,
      required: [true, 'Action title is required'],
      trim: true,
      maxlength: 200,
    },
    instructions: {
      type: String,
      required: [true, 'Action instructions are required'],
      trim: true,
      maxlength: 1000,
    },
    suggestedDiscountPercent: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100'],
      default: 0,
    },
    proposedSellingPrice: {
      type: Number,
      min: [0, 'Proposed selling price cannot be negative'],
      default: 0,
    },
    minimumSafePrice: {
      type: Number,
      min: [0, 'Minimum safe price cannot be negative'],
      default: 0,
    },
    quantity: {
      type: Number,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    inventoryCostValue: {
      type: Number,
      min: [0, 'Inventory cost exposure cannot be negative'],
      default: 0,
    },
    expectedRecoveryValue: {
      type: Number,
      min: [0, 'Expected recovery value cannot be negative'],
      default: 0,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'critical'],
        message: 'Priority must be one of: low, medium, high, critical',
      },
      default: 'medium',
    },
    reasonCodes: [{ type: String, trim: true }],
    rationale: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed', 'skipped'],
        message: 'Status must be one of: pending, in_progress, completed, skipped',
      },
      default: 'pending',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { timestamps: true }
);

const RecoveryPlanSchema = new Schema(
  {
    // ── Multi-Merchant Tenant Ownership (Phase 11) ──────────────────────
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: true,
    },
    planTitle: {
      type: String,
      default: '7-Day Cash Recovery Action Plan',
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Plan start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Plan end date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    targetRecoveryRatePercent: {
      type: Number,
      default: 78,
      min: 0,
    },
    totalCostExposure: {
      type: Number,
      min: 0,
      default: 0,
    },
    estimatedTotalRecoveryValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    actions: [RecoveryActionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
RecoveryPlanSchema.index({ merchantId: 1, status: 1, startDate: -1 });
RecoveryPlanSchema.index({ status: 1, startDate: -1 });
RecoveryPlanSchema.index({ 'actions.productId': 1 });
RecoveryPlanSchema.index({ 'actions.day': 1 });
RecoveryPlanSchema.index({ 'actions.status': 1 });

export default mongoose.model('RecoveryPlan', RecoveryPlanSchema);
