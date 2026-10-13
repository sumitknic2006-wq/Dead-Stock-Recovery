import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../app.js';

describe('Backend API Endpoints & CORS (Phase 1, 2 & 3)', () => {
  let server;
  let baseUrl;
  const originalEnvUri = process.env.MONGODB_URI;

  before((_, done) => {
    // Bind to ephemeral port 0
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    process.env.MONGODB_URI = originalEnvUri;
    server.close(done);
  });

  test('GET /api/health returns 200 with ok status and payload when database is connected', async () => {
    // Mock connected state
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/stocksaathi-test';
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(response.status, 200);

      const data = await response.json();
      assert.strictEqual(data.status, 'ok');
      assert.ok(data.message.includes('StockSaathi AI Backend'));
      assert.ok(typeof data.uptime === 'number');
      assert.ok(data.timestamp);
      assert.ok(data.environment);
      assert.strictEqual(data.database.status, 'connected');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });

  test('GET /api/health returns 200 with degraded status when database is not configured', async () => {
    delete process.env.MONGODB_URI;
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(response.status, 200);

      const data = await response.json();
      assert.strictEqual(data.status, 'degraded');
      assert.ok(data.message.includes('Database is not connected'));
      assert.strictEqual(data.database.status, 'not_configured');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });

  test('GET /unknown-route returns 404 with structured error', async () => {
    const response = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    assert.strictEqual(response.status, 404);

    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.statusCode, 404);
    assert.ok(data.error.message.includes('Route not found'));
  });

  test('GET / returns 200 with API discovery and Phase 10 version', async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.name, 'StockSaathi AI API');
    assert.ok(data.version.includes('Phase 10'));
    assert.ok(data.endpoints.health);
    assert.ok(data.endpoints.products);
    assert.ok(data.endpoints.campaignsGenerate);
  });

  test('CORS: Allows requests from Vite development origin (http://localhost:5173)', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173'
      }
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(
      response.headers.get('access-control-allow-origin'),
      'http://localhost:5173'
    );
  });

  test('CORS: Handles OPTIONS preflight from http://localhost:5173', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });

    assert.strictEqual(
      response.headers.get('access-control-allow-origin'),
      'http://localhost:5173'
    );
  });

  test('CORS: Blocks requests from unauthorized origin', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://unauthorized-domain.com'
      }
    });

    assert.notStrictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.message.includes('CORS blocked'));
  });
});
