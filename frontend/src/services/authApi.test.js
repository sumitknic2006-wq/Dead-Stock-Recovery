import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import {
  registerMerchant,
  loginMerchant,
  logoutMerchant,
  getMerchantProfile,
} from './authApi.js';
import { getAuthToken, setAuthToken, clearAuthToken } from './api.js';

describe('Merchant Authentication API Client (authApi.js)', () => {
  let server;
  let testPort;
  let receivedAuthHeader = null;

  before((_, done) => {
    server = http.createServer((req, res) => {
      receivedAuthHeader = req.headers.authorization || null;

      if (req.url === '/auth/register' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const parsed = JSON.parse(body);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: {
                merchant: {
                  id: 'merchant-test-123',
                  email: parsed.email,
                  name: parsed.name,
                },
                token: 'mock-jwt-token-alpha',
              },
            })
          );
        });
      } else if (req.url === '/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const parsed = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: {
                merchant: {
                  id: 'merchant-test-123',
                  email: parsed.email,
                },
                token: 'mock-jwt-token-beta',
              },
            })
          );
        });
      } else if (req.url === '/auth/logout' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Logged out cleanly' }));
      } else if (req.url === '/auth/me' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              id: 'merchant-test-123',
              email: 'verified@kirana.store',
              businessName: 'Sharma Kirana',
            },
          })
        );
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: { message: 'Not Found' } }));
      }
    });

    server.listen(0, () => {
      testPort = server.address().port;
      process.env.VITE_API_BASE_URL = `http://127.0.0.1:${testPort}`;
      done();
    });
  });

  after((_, done) => {
    clearAuthToken();
    server.close(done);
  });

  test('registerMerchant sends POST /auth/register and stores token', async () => {
    clearAuthToken();
    const res = await registerMerchant({
      email: 'new_retailer@kirana.com',
      password: 'Password123!',
      name: 'Ramesh Patel',
      businessName: 'Patel Provisions',
      storeCategory: 'Grocery & Kirana',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.merchant.email, 'new_retailer@kirana.com');
    assert.strictEqual(getAuthToken(), 'mock-jwt-token-alpha');
  });

  test('loginMerchant sends POST /auth/login and updates token', async () => {
    clearAuthToken();
    const res = await loginMerchant({
      email: 'existing@kirana.com',
      password: 'Password123!',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.token, 'mock-jwt-token-beta');
    assert.strictEqual(getAuthToken(), 'mock-jwt-token-beta');
  });

  test('getMerchantProfile transmits Authorization header with active token', async () => {
    setAuthToken('bearer-proof-token-123');
    const res = await getMerchantProfile();

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.id, 'merchant-test-123');
    assert.strictEqual(receivedAuthHeader, 'Bearer bearer-proof-token-123');
  });

  test('logoutMerchant sends POST /auth/logout and clears client token', async () => {
    setAuthToken('token-to-be-cleared');
    assert.ok(getAuthToken());

    const res = await logoutMerchant();
    assert.strictEqual(res.success, true);
    assert.strictEqual(getAuthToken(), null);
  });
});
