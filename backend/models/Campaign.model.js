/**
 * StockSaathi AI — Campaign Mongoose Model (Phase 9)
 *
 * Persists personalized WhatsApp Clearance Campaigns for small retailers.
 * Stores generated message templates, language/tone configurations,
 * product snapshots, and Phase 7 profit-safe price floors.
 *
 * NOTE: Never stores customer phone numbers or personal customer data.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const ProductSnapshotSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    quantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    purchaseCost: {
      type: Number,
      required: [true, 'Purchase cost is required'],
      min: [0, 'Purchase cost cannot be negative'],
    },
  },
  { _id: false }
);

const CampaignSchema = new Schema(
  {
    // ── Multi-Merchant Tenant Ownership (Phase 11) ──────────────────────
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: true,
    },
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: 200,
    },
    campaignType: {
      type: String,
      required: [true, 'Campaign type is required'],
      enum: {
        values: ['flash_sale', 'clearance', 'bundle_offer', 'near_expiry'],
        message: 'Invalid campaignType value',
      },
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    productSnapshot: {
      type: ProductSnapshotSchema,
      required: [true, 'Product snapshot is required'],
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['all_customers', 'repeat_customers', 'local_customers', 'custom'],
        message: 'Invalid targetAudience value',
      },
      default: 'all_customers',
    },
    language: {
      type: String,
      enum: {
        values: ['english', 'hindi', 'hinglish'],
        message: 'Language must be one of: english, hindi, hinglish',
      },
      default: 'english',
    },
    tone: {
      type: String,
      enum: {
        values: ['friendly', 'urgent', 'professional'],
        message: 'Tone must be one of: friendly, urgent, professional',
      },
      default: 'friendly',
    },
    discountPercent: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100'],
      default: 0,
    },
    proposedSellingPrice: {
      type: Number,
      required: [true, 'Proposed selling price is required'],
      min: [0, 'Proposed selling price cannot be negative'],
    },
    minimumSafePrice: {
      type: Number,
      required: [true, 'Minimum safe price floor is required'],
      min: [0, 'Minimum safe price cannot be negative'],
    },
    message: {
      type: String,
      required: [true, 'Promotional message text is required'],
      trim: true,
      maxlength: 2500,
    },
    callToAction: {
      type: String,
      trim: true,
      maxlength: 300,
      default: 'Reply to reserve or visit our store today!',
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'ready', 'archived'],
        message: 'Status must be one of: draft, ready, archived',
      },
      default: 'draft',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
CampaignSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
CampaignSchema.index({ status: 1, createdAt: -1 });
CampaignSchema.index({ merchantId: 1, productId: 1 });
CampaignSchema.index({ productId: 1 });
CampaignSchema.index({ campaignType: 1 });
CampaignSchema.index({ language: 1 });

export default mongoose.model('Campaign', CampaignSchema);
