/**
 * StockSaathi AI — Merchant Authentication & Session Tests (Phase 11)
 *
 * Verifies:
 * 1. Merchant Registration (successful, hash security, email normalization)
 * 2. Duplicate Account Prevention (409 Conflict)
 * 3. Validation Rules (missing fields, invalid email format, short password)
 * 4. Merchant Login (successful with JWT + Cookie, generic error for invalid credentials)
 * 5. Current User / Profile Endpoint (/api/auth/me - authenticated vs unauthenticated)
 * 6. Logout / Session Clearing (/api/auth/logout)
 */

import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import Merchant from '../models/Merchant.model.js';

describe('Merchant Authentication & Security (Phase 11)', () => {
  let server;
  let baseUrl;
  const testEmail = `auth_test_${Date.now()}@kirana.store`;
  const testPassword = 'SecurePassword123!';
  let authToken = '';

  before(async () => {
    await connectDB();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    // Cleanup created test merchants
    await Merchant.deleteMany({ email: { $regex: /^auth_test_/ } });
    if (server) await new Promise((r) => server.close(r));
    await disconnectDB();
  });

  describe('1. Merchant Registration', () => {
    test('POST /api/auth/register — creates a new merchant account with hashed password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ramesh Sharma',
          email: testEmail.toUpperCase(), // Test email normalization
          password: testPassword,
          businessName: 'Sharma General Store',
        }),
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();

      assert.strictEqual(json.success, true);
      assert.ok(json.data.token, 'JWT token returned in response');
      assert.strictEqual(json.data.merchant.email, testEmail.toLowerCase());
      assert.strictEqual(json.data.merchant.name, 'Ramesh Sharma');
      assert.strictEqual(json.data.merchant.businessName, 'Sharma General Store');
      assert.strictEqual(json.data.merchant.password, undefined, 'Password is never returned');
      assert.strictEqual(json.data.merchant.passwordHash, undefined, 'Password hash is never returned');

      // Verify Set-Cookie header contains HttpOnly token
      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader, 'Set-Cookie header present');
      assert.ok(cookieHeader.includes('token='), 'Cookie contains token');
      assert.ok(cookieHeader.includes('HttpOnly'), 'Cookie is HttpOnly');

      // Verify direct database storage is securely hashed
      const dbMerchant = await Merchant.findOne({ email: testEmail.toLowerCase() }).select('+password');
      assert.ok(dbMerchant, 'Merchant persisted in database');
      assert.notStrictEqual(dbMerchant.password, testPassword, 'Password is not plaintext');
      assert.ok(dbMerchant.password.startsWith('$2'), 'Bcrypt password hash format verified');
    });

    test('POST /api/auth/register — rejects duplicate email registration with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Ramesh',
          email: testEmail.toLowerCase(),
          password: 'AnotherPassword123!',
        }),
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('already registered'));
    });

    test('POST /api/auth/register — rejects invalid email and short password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'not-an-email',
          password: 'short',
        }),
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.errors.length >= 3, 'Validation errors returned for name, email, password');
    });
  });

  describe('2. Merchant Login', () => {
    test('POST /api/auth/login — authenticates valid credentials and returns JWT session', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.token);
      assert.strictEqual(json.data.merchant.email, testEmail.toLowerCase());
      assert.strictEqual(json.data.merchant.password, undefined);

      authToken = json.data.token;
    });

    test('POST /api/auth/login — rejects incorrect password with generic error (no credential disclosure)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword999!',
        }),
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.message, 'Invalid email or password');
    });

    test('POST /api/auth/login — rejects nonexistent email with identical generic error', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_merchant_9999@test.com',
          password: 'AnyPassword123!',
        }),
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.message, 'Invalid email or password');
    });
  });

  describe('3. Current Merchant Profile & Session Verification (/api/auth/me)', () => {
    test('GET /api/auth/me — returns current authenticated merchant details via Bearer token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.email, testEmail.toLowerCase());
      assert.strictEqual(json.data.name, 'Ramesh Sharma');
      assert.strictEqual(json.data.password, undefined);
    });

    test('GET /api/auth/me — rejects unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('Authentication required'));
    });

    test('GET /api/auth/me — rejects forged/tampered token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid.tampered.jwttoken',
        },
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('Invalid or expired'));
    });
  });

  describe('4. Logout & Session Invalidation (/api/auth/logout)', () => {
    test('POST /api/auth/logout — clears cookie and returns success response', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.message.includes('Logged out'));

      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader);
      assert.ok(cookieHeader.includes('token=;') || cookieHeader.includes('Expires=Thu, 01 Jan 1970'));
    });
  });
});
