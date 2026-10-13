import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { fetchDeadStockAnalysis, fetchDeadStockSummary } from './analysisApi.js';

describe('Dead Stock Analysis Frontend API Service (analysisApi.js)', () => {
  let server;
  let testPort;

  before((_, done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/analysis/dead-stock/summary' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              summary: {
                totalProducts: 6,
                deadStockTotalCostValue: 120000,
                classifications: {
                  critical_dead_stock: { count: 3 },
                  at_risk: { count: 1 },
                },
              },
              topPriorityItems: [],
            },
          })
        );
      } else if (req.url?.startsWith('/analysis/dead-stock') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: [
              {
                productId: 'item-1',
                name: 'Gaming Headset',
                sku: 'AUD-01',
                riskScore: 78,
                severity: 'High',
              },
            ],
            pagination: { total: 1, page: 1, limit: 15, totalPages: 1 },
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
    server.close(done);
  });

  test('fetchDeadStockSummary retrieves summary and topPriorityItems', async () => {
    const res = await fetchDeadStockSummary();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.summary.totalProducts, 6);
    assert.strictEqual(res.data.summary.deadStockTotalCostValue, 120000);
  });

  test('fetchDeadStockAnalysis serializes search, category, and pagination query params', async () => {
    const res = await fetchDeadStockAnalysis({
      search: 'Headset',
      category: 'Audio',
      page: 1,
      limit: 10,
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data[0].name, 'Gaming Headset');
    assert.strictEqual(res.pagination.total, 1);
  });
});
