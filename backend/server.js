import dotenv from 'dotenv';
// Load environment variables before any application logic
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = parseInt(process.env.PORT, 10) || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

async function startServer() {
  try {
    // Attempt database connection if configured
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '') {
      console.log('[StockSaathi AI Backend] Initializing MongoDB connection...');
      await connectDB();
    } else {
      console.warn('[StockSaathi AI Backend] Notice: MONGODB_URI is not configured in .env. Server running with database: not_configured.');
    }

    server = app.listen(PORT, () => {
      console.log(`[StockSaathi AI Backend] Running in ${NODE_ENV} mode on port ${PORT}`);
      console.log(`[StockSaathi AI Backend] Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[StockSaathi AI Backend Error] Port ${PORT} is already in use.`);
        if (PORT === 5000 && process.platform === 'darwin') {
          console.error(`Note for macOS: Port 5000 is occupied by macOS AirPlay Receiver (ControlCenter).`);
          console.error(`Solutions:`);
          console.error(`  1. Use PORT=5001 in backend .env and update frontend .env to VITE_API_BASE_URL=http://localhost:5001/api`);
          console.error(`  2. Or disable AirPlay Receiver in System Settings > General > AirDrop & AirPlay > AirPlay Receiver.\n`);
        } else {
          console.error(`Set a different port via PORT in .env (e.g., PORT=5001).\n`);
        }
        process.exit(1);
      } else {
        console.error('[StockSaathi AI Backend Error]', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error(`[StockSaathi AI Backend Startup Error] ${err.message}`);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[StockSaathi AI Backend] ${signal} received. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[StockSaathi AI Backend] HTTP server closed.');
      try {
        await disconnectDB();
      } catch (err) {
        console.error('[StockSaathi AI Backend] Error during database disconnect:', err.message);
      }
      console.log('[StockSaathi AI Backend] Process terminated cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export default app;
