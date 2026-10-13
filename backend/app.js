import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import discountRoutes from './routes/discount.routes.js';
import recoveryRoutes from './routes/recovery.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust reverse proxy (e.g. Render, Railway, Cloudflare) for secure cookies and X-Forwarded headers
app.set('trust proxy', 1);

// Allowed origins for CORS (Vite dev defaults and configurable production origins)
const envOriginsRaw =
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  '';

const configuredOrigins = envOriginsRaw
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, health probes) with no origin header
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow configured origins or local Vite dev server port shifts (e.g. 5173, 5174, 5175)
    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(normalizedOrigin) ||
      (configuredOrigins.includes('*') && true);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} not permitted`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

// Standard middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route for API discovery
app.get('/', (_req, res) => {
  res.json({
    name: 'StockSaathi AI API',
    tagline: 'Recover Cash. Protect Profit. Grow Smarter.',
    version: '1.0.0 (Phase 10 / Phase 11 - Multi-Merchant Auth & Cloud Deployment)',
    endpoints: {
      health: '/api/health',
      authRegister: '/api/auth/register',
      authLogin: '/api/auth/login',
      authLogout: '/api/auth/logout',
      authMe: '/api/auth/me',
      products: '/api/products',
      productSummary: '/api/products/summary',
      csvPreview: '/api/products/csv/preview',
      csvImport: '/api/products/csv/import',
      csvExport: '/api/products/csv/export',
      deadStockAnalysis: '/api/analysis/dead-stock',
      deadStockSummary: '/api/analysis/dead-stock/summary',
      discountsCalculate: '/api/discounts/calculate',
      discountsMinimumPrice: '/api/discounts/minimum-price',
      discountsRecommend: '/api/discounts/recommend',
      discountsHealth: '/api/discounts/health',
      recoveryPlan: '/api/recovery/plan',
      recoverySummary: '/api/recovery/summary',
      recoveryPlanGenerate: '/api/recovery/plan/generate',
      recoveryActionStatus: '/api/recovery/actions/:id/status',
      campaignsGenerate: '/api/campaigns/generate',
      campaignsList: '/api/campaigns',
      campaignsHealth: '/api/campaigns/health',
    },
  });
});

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/campaigns', campaignRoutes);

// Catch-all for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;

