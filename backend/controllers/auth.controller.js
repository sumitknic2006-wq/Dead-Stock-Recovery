/**
 * StockSaathi AI — Auth Controller (Phase 11)
 *
 * Request handlers for merchant authentication, session termination, and profile queries.
 */

import { getDatabaseStatus } from '../config/db.js';
import {
  registerMerchant,
  loginMerchant,
  getMerchantProfile,
} from '../services/auth.service.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 */
export async function registerHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot register merchant account.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateRegister(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const result = await registerMerchant(req.body);

    res.cookie('token', result.token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Merchant account registered successfully',
      data: {
        merchant: result.merchant,
        token: result.token,
      },
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          message: err.message,
          statusCode: 409,
        },
      });
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function loginHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot process login.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const validation = validateLogin(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          statusCode: 400,
          errors: validation.errors,
        },
      });
    }

    const result = await loginMerchant(req.body);

    res.cookie('token', result.token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        merchant: result.merchant,
        token: result.token,
      },
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: {
          message: err.message,
          statusCode: 401,
        },
      });
    }
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logoutHandler(_req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * GET /api/auth/me
 */
export async function meHandler(req, res, next) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.status !== 'connected') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database is not connected. Cannot retrieve profile.',
          statusCode: 503,
          databaseStatus: dbStatus.status,
        },
      });
    }

    const profile = await getMerchantProfile(req.merchant.id);
    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        merchant: profile,
      },
    });
  } catch (err) {
    next(err);
  }
}
