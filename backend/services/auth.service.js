/**
 * StockSaathi AI — Auth Service (Phase 11)
 *
 * Business logic for merchant account registration, credential verification,
 * and profile retrieval.
 */

import Merchant from '../models/Merchant.model.js';
import { generateToken } from '../middleware/auth.middleware.js';

/**
 * Registers a new merchant.
 * @param {object} params
 * @returns {Promise<{ merchant: object, token: string }>}
 */
export async function registerMerchant({ name, email, password, businessName }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await Merchant.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('An account with this email address is already registered.');
    error.statusCode = 409;
    throw error;
  }

  const merchant = new Merchant({
    name: name.trim(),
    email: normalizedEmail,
    password,
    businessName: businessName ? businessName.trim() : 'My Retail Store',
  });

  await merchant.save();

  const token = generateToken(merchant);

  return {
    merchant: merchant.toJSON(),
    token,
  };
}

/**
 * Authenticates merchant credentials and issues JWT.
 * @param {object} params
 * @returns {Promise<{ merchant: object, token: string }>}
 */
export async function loginMerchant({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Explicitly select password field since it is omitted by default
  const merchant = await Merchant.findOne({ email: normalizedEmail }).select('+password');

  if (!merchant || merchant.status !== 'active') {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await merchant.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(merchant);

  return {
    merchant: merchant.toJSON(),
    token,
  };
}

/**
 * Retrieves the current merchant profile by ID.
 * @param {string} merchantId
 * @returns {Promise<object>}
 */
export async function getMerchantProfile(merchantId) {
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    const error = new Error('Merchant account not found.');
    error.statusCode = 404;
    throw error;
  }
  return merchant.toJSON();
}
