import { test, describe } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB, getDatabaseStatus } from '../config/db.js';

describe('Database Connection Module (db.js)', () => {
  test('getDatabaseStatus returns not_configured when MONGODB_URI is unset or empty', () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    try {
      const status = getDatabaseStatus();
      assert.strictEqual(status.status, 'not_configured');
    } finally {
      process.env.MONGODB_URI = originalUri;
    }
  });

  test('getDatabaseStatus reflects Mongoose readyState', () => {
    const originalUri = process.env.MONGODB_URI;
    const originalReadyState = mongoose.connection.readyState;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/stocksaathi';

    try {
      // Test connected readyState (1)
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      assert.strictEqual(getDatabaseStatus().status, 'connected');

      // Test disconnected readyState (0)
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
      assert.strictEqual(getDatabaseStatus().status, 'disconnected');

      // Test connecting readyState (2)
      Object.defineProperty(mongoose.connection, 'readyState', { value: 2, configurable: true });
      assert.strictEqual(getDatabaseStatus().status, 'connecting');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      process.env.MONGODB_URI = originalUri;
    }
  });

  test('connectDB safely handles missing MONGODB_URI without throwing', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    try {
      const result = await connectDB();
      assert.strictEqual(result, null);
    } finally {
      process.env.MONGODB_URI = originalUri;
    }
  });

  test('connectDB fails and throws an error on invalid / unreachable host', async () => {
    // Port 27019 on 127.0.0.1 with 500ms timeout
    const invalidUri = 'mongodb://127.0.0.1:27019/stocksaathi-unreachable?serverSelectionTimeoutMS=500';

    await assert.rejects(
      async () => {
        await connectDB(invalidUri);
      },
      (err) => {
        assert.ok(err instanceof Error);
        // Ensure credentials are not in error object
        assert.ok(!err.message.includes('password'));
        return true;
      }
    );
  });

  test('connectDB avoids duplicate connections when already connected', async () => {
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const conn = await connectDB('mongodb://127.0.0.1:27017/stocksaathi');
      assert.strictEqual(conn, mongoose);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });

  test('Optional Integration Test: Connects to real database if TEST_MONGODB_URI is provided', async (t) => {
    const testUri = process.env.TEST_MONGODB_URI;
    if (!testUri) {
      t.skip('Skipping real integration test: TEST_MONGODB_URI is not configured.');
      return;
    }

    const conn = await connectDB(testUri);
    assert.ok(conn);
    assert.strictEqual(mongoose.connection.readyState, 1);
    await disconnectDB();
  });
});
