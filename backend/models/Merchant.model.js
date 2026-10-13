/**
 * StockSaathi AI — Merchant Model (Phase 11)
 *
 * Represents an authenticated small retail merchant account.
 * Multi-tenant boundary: all inventory, dead stock, recovery plans,
 * and WhatsApp campaigns belong to a specific Merchant.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MerchantSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
      maxlength: [120, 'Name must be 120 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => emailRegex.test(v),
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Do not return password by default in queries
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [150, 'Business name must be 150 characters or fewer'],
      default: 'My Retail Store',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
MerchantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
MerchantSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Merchant', MerchantSchema);
