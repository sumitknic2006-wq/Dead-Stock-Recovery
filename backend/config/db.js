import mongoose from 'mongoose';

/**
 * Returns current database status based on Mongoose readyState and environment configuration.
 * Possible return states: 'connected', 'connecting', 'disconnected', 'not_configured'
 *
 * @returns {{ status: 'connected' | 'connecting' | 'disconnected' | 'not_configured', details?: string }}
 */
export function getDatabaseStatus() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
    return { status: 'not_configured' };
  }

  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return { status: 'connected' };
    case 2:
      return { status: 'connecting' };
    case 3:
      return { status: 'disconnected', details: 'disconnecting' };
    case 0:
    default:
      return { status: 'disconnected' };
  }
}

/**
 * Connects to MongoDB Atlas using Mongoose.
 * Validates configuration, avoids duplicate connections, and configures reliable timeouts.
 *
 * @param {string} [uri] - Optional URI override (primarily for automated integration testing)
 * @returns {Promise<typeof mongoose | null>}
 */
export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    console.warn('[Database] MONGODB_URI environment variable is not configured. Database is not connected.');
    return null;
  }

  // Prevent duplicate connections if already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely if IP not whitelisted
      autoIndex: true
    });

    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    console.error(`[Database Action] Check your MongoDB Atlas cluster state, network IP whitelist, and credentials in backend/.env.`);
    throw error;
  }
}

/**
 * Closes the active MongoDB connection gracefully.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly.');
  }
}
