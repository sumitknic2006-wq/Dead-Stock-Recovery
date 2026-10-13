/**
 * StockSaathi AI — Authentication Middleware (Phase 11)
 *
 * Verifies JWT tokens from Authorization header (Bearer) or HttpOnly cookies.
 * Attaches authenticated merchant identity to req.merchant.
 */

import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'stocksaathi_default_fallback_jwt_secret_dev';

/**
 * Generates signed JWT for authenticated merchant.
 * @param {object} merchant - Merchant document or object
 * @returns {string} Signed JWT string
 */
export function generateToken(merchant) {
  const payload = {
    id: merchant._id ? merchant._id.toString() : merchant.id,
    email: merchant.email,
    name: merchant.name,
    businessName: merchant.businessName || 'My Retail Store',
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Extracts JWT token from request Authorization header or cookie.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Mandatory authentication middleware.
 * Rejects unauthenticated requests with 401 Unauthorized.
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Please log in to access this resource.',
        statusCode: 401,
      },
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.merchant = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      businessName: decoded.businessName,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired authentication session. Please log in again.',
        statusCode: 401,
      },
    });
  }
}

/**
 * Optional authentication middleware.
 * Attaches merchant context if a valid token is present; proceeds without failing if absent.
 */
export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    req.merchant = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.merchant = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      businessName: decoded.businessName,
    };
  } catch {
    req.merchant = null;
  }

  next();
}
