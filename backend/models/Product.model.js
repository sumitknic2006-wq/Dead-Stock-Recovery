/**
 * StockSaathi AI — Product Mongoose Model (Phase 5)
 *
 * Represents a physical inventory product held by a small retailer.
 * All monetary values are stored in INR (Indian Rupees).
 * Dead-stock classification is a Phase 6 concern and is NOT computed here.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Normalises a SKU string: uppercase, strip leading/trailing whitespace,
 * collapse internal whitespace to a single hyphen.
 */
function normaliseSku(raw) {
  if (typeof raw !== 'string') return raw;
  return raw.trim().toUpperCase().replace(/\s+/g, '-');
}

const ProductSchema = new Schema(
  {
    // ── Multi-Merchant Tenant Ownership (Phase 11) ──────────────────────
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: true,
    },

    // ── Core identification ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name must be 200 characters or fewer'],
    },

    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      maxlength: [60, 'SKU must be 60 characters or fewer'],
      set: normaliseSku,
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category must be 100 characters or fewer'],
    },

    // ── Pricing ──────────────────────────────────────────────────────────
    purchaseCost: {
      type: Number,
      required: [true, 'Purchase cost is required'],
      min: [0, 'Purchase cost cannot be negative'],
    },

    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },

    // ── Stock ────────────────────────────────────────────────────────────
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    // ── Optional profit targets ──────────────────────────────────────────
    minimumDesiredProfitPerUnit: {
      type: Number,
      min: [0, 'Minimum desired profit per unit cannot be negative'],
      default: null,
    },

    minimumGrossMarginPercent: {
      type: Number,
      min: [0, 'Gross margin percentage cannot be negative'],
      max: [100, 'Gross margin percentage cannot exceed 100'],
      default: null,
    },

    // ── Dates ────────────────────────────────────────────────────────────
    dateAdded: {
      type: Date,
      required: [true, 'Date added is required'],
      default: Date.now,
    },

    lastSaleDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    // ── Sales history (optional, informational) ──────────────────────────
    /**
     * unitsSoldDuringPeriod: number of units sold during a tracked period.
     * This is informational only. It does NOT drive dead-stock classification
     * (that is a Phase 6 concern).
     */
    unitsSoldDuringPeriod: {
      type: Number,
      min: [0, 'Units sold cannot be negative'],
      validate: {
        validator: (v) => v === null || v === undefined || Number.isInteger(v),
        message: 'Units sold must be a whole number',
      },
      default: null,
    },

    // ── Supplementary metadata ───────────────────────────────────────────
    supplierName: {
      type: String,
      trim: true,
      maxlength: [150, 'Supplier name must be 150 characters or fewer'],
      default: null,
    },

    condition: {
      type: String,
      enum: {
        values: ['new', 'open-box', 'refurbished', 'damaged'],
        message: 'Condition must be one of: new, open-box, refurbished, damaged',
      },
      default: 'new',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes must be 1000 characters or fewer'],
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
ProductSchema.index({ sku: 1, merchantId: 1 }, { unique: true, sparse: true });
ProductSchema.index({ merchantId: 1, category: 1 });
ProductSchema.index({ merchantId: 1, dateAdded: -1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', sku: 'text' }); // text search
ProductSchema.index({ dateAdded: -1 });
ProductSchema.index({ quantity: 1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────

/** Inventory cost value of this product line: purchaseCost × quantity */
ProductSchema.virtual('inventoryCostValue').get(function () {
  return parseFloat((this.purchaseCost * this.quantity).toFixed(2));
});

/** Potential sales value of this product line: sellingPrice × quantity */
ProductSchema.virtual('potentialSalesValue').get(function () {
  return parseFloat((this.sellingPrice * this.quantity).toFixed(2));
});

/** Estimated gross profit at listed price: (sellingPrice − purchaseCost) × quantity */
ProductSchema.virtual('estimatedGrossProfit').get(function () {
  return parseFloat(((this.sellingPrice - this.purchaseCost) * this.quantity).toFixed(2));
});

/** Gross margin percentage at listed price */
ProductSchema.virtual('grossMarginPercent').get(function () {
  if (!this.sellingPrice || this.sellingPrice === 0) return 0;
  return parseFloat((((this.sellingPrice - this.purchaseCost) / this.sellingPrice) * 100).toFixed(2));
});

export default mongoose.model('Product', ProductSchema);
