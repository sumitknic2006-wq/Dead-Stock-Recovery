import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { apiRequest, ApiError, getBackendHealth } from './api.js';

describe('Frontend API Service (api.js)', () => {
  let server;
  let testPort;

  before((_, done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Backend is running' }));
      } else if (req.url === '/error' && req.method === 'GET') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: { message: 'Internal Server Error' } }));
      } else if (req.url === '/invalid-json' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('invalid json string {]');
      } else if (req.url === '/html-error' && req.method === 'GET') {
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end('<html><body>Bad Gateway</body></html>');
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
    server.close(done);
  });

  test('apiRequest parses valid JSON response on 200', async () => {
    const data = await apiRequest('/health');
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.message, 'Backend is running');
  });

  test('apiRequest throws ApiError with status and message on 500 error', async () => {
    await assert.rejects(
      async () => {
        await apiRequest('/error');
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 500);
        assert.strictEqual(err.message, 'Internal Server Error');
        return true;
      }
    );
  });

  test('apiRequest throws ApiError on 404 route', async () => {
    await assert.rejects(
      async () => {
        await apiRequest('/non-existent');
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.message, 'Not Found');
        return true;
      }
    );
  });

  test('apiRequest throws ApiError on invalid JSON payload', async () => {
    await assert.rejects(
      async () => {
        await apiRequest('/invalid-json');
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.ok(err.message.includes('Failed to parse JSON'));
        return true;
      }
    );
  });

  test('apiRequest throws ApiError on non-JSON HTML error page', async () => {
    await assert.rejects(
      async () => {
        await apiRequest('/html-error');
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 502);
        return true;
      }
    );
  });

  test('apiRequest throws ApiError with statusCode 0 on connection failure', async () => {
    // Port 1 is reserved and unavailable
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:1';
    await assert.rejects(
      async () => {
        await apiRequest('/health');
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 0);
        assert.ok(err.message.includes('Cannot connect to backend'));
        return true;
      }
    );
    // Restore test port
    process.env.VITE_API_BASE_URL = `http://127.0.0.1:${testPort}`;
  });

  test('getBackendHealth calls health endpoint successfully', async () => {
    const health = await getBackendHealth();
    assert.strictEqual(health.status, 'ok');
  });
});
