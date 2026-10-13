# StockSaathi AI

> **AI-Powered Dead Stock Recovery for Small Retailers**  
> *Tagline: Recover Cash. Protect Profit. Grow Smarter.*

---

## 1. Project Objective
StockSaathi AI is an intelligent inventory optimization and dead stock recovery platform designed specifically for small retail businesses. It identifies stagnant inventory, calculates margin-preserving dynamic discounts, formulates 7-day cash recovery action plans, and enables direct WhatsApp promotion broadcasts to clear dead stock without eroding brand equity.

This repository reflects **Phases 1 through 10: Foundation, UI/UX, Inventory Management, Dead Stock Analysis, Profit-Safe Discounts, 7-Day Recovery Planner, Personalized WhatsApp Clearance Campaigns, and Full-System Integration & Production Readiness**.

---

## 2. Mandatory UI/UX Reference Preservation
- **Authoritative Reference:** The StockSaathi AI dashboard screenshot provided by the user is the **sole, immutable source of truth** for all application UI/UX.
- **Strict Constraint:** No redesign, reinterpretation, simplification, or substitution of layout, colors, charts, cards, or sidebar navigation will take place.
- **Phase Separation:** The actual UI implementation is strictly reserved for Phase 4+. The diagnostic frontend interface provides real-time verification of frontend-backend-database connectivity.

---

## 3. Structural Inspiration (RESTIFY Reference)
- The [RESTIFY repository](https://github.com/sumitknic2006-wq/RESTIFY) was referenced **exclusively for folder organization, decoupled repository architecture, and documentation layout**.
- **No business logic, application features, branding, or unrelated code** was borrowed or copied from RESTIFY. StockSaathi AI remains an entirely independent application.

---

## 4. Technology Stack (Option A)

| Layer | Technologies | Notes |
|---|---|---|
| **Frontend** | React 18, Vite, JavaScript (JSX), Tailwind CSS, Lucide React, Recharts, React Router | Client SPA with real HTTP API service |
| **Backend** | Node.js, Express.js, Mongoose 8+, CORS, dotenv | Lightweight REST API with safe startup |
| **Database** | MongoDB Atlas / Local MongoDB | Managed via Mongoose in `backend/config/db.js` |
| **Tooling** | npm (strictly maintained, no Yarn) | Standard npm toolchain |

---

## 5. Root Project Map

```text
StockSaathi-AI/
├── backend/                  # Node.js + Express REST API
│   ├── config/               # Database & application configuration
│   │   └── db.js             # Mongoose connection & status management
│   ├── controllers/          # Request handlers
│   ├── models/               # Mongoose schemas (Phase 4+)
│   ├── routes/               # Express route endpoints
│   │   └── health.routes.js  # Extended health check with DB status
│   ├── middleware/           # Error handling, 404, CORS middleware
│   ├── validators/           # Input validation logic
│   ├── services/             # Business calculations & services
│   ├── utils/                # Helper utilities
│   ├── tests/                # Automated API test suite
│   │   ├── health.test.js    # Health, degraded state, & CORS test suite
│   │   └── db.test.js        # Mongoose connection & readyState tests
│   ├── app.js                # Express app configuration & middleware
│   ├── server.js             # Database startup, lifecycle & listener
│   ├── package.json          # Backend dependencies & scripts
│   └── .env.example          # Environment variable template
├── frontend/                 # React 18 + Vite Single Page Application
│   ├── public/               # Static public assets
│   ├── src/                  # Source code
│   │   ├── assets/           # Media & static design assets
│   │   ├── components/       # Reusable UI components
│   │   ├── layouts/          # Layout wrappers (Sidebar, TopNav)
│   │   ├── pages/            # Application views (Dashboard, etc.)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # State management contexts
│   │   ├── services/         # Frontend API integration services
│   │   │   ├── api.js        # Reusable fetch client & health requester
│   │   │   └── api.test.js   # Unit tests for api.js
│   │   ├── utils/            # Helper utilities
│   │   ├── App.jsx           # Diagnostic connection verification tool
│   │   ├── main.jsx          # SPA entry point with React Router
│   │   └── index.css         # Tailwind CSS directives & global styling
│   ├── index.html            # HTML entry point
│   ├── vite.config.js        # Vite build configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── postcss.config.js     # PostCSS pipeline configuration
│   ├── package.json          # Frontend dependencies & scripts
│   └── .env.example          # Frontend environment template
├── browser-extension/        # Reserved placeholder directory (Future Scope)
│   └── README.md             # Extension scope documentation
├── docs/                     # Architectural and operational documentation
│   ├── architecture.md       # High-level architecture & design
│   ├── api.md                # REST API contract & endpoints
│   ├── setup.md              # Installation & MongoDB Atlas guide
│   ├── testing.md            # Testing procedures & verification
│   └── limitations.md        # Strict scope boundaries & deferred items
├── .gitignore                # Protects secrets, node_modules, & builds
└── README.md                 # Root project documentation
```

---

## 6. Project Phase Progress

### Completed in Phase 1 & 2:
- [x] Dedicated `StockSaathi-AI/` root structure established.
- [x] Express backend configured with CORS restricted to Vite origin.
- [x] React + Vite frontend configured with Tailwind CSS and Lucide React.
- [x] Centralized, reusable frontend API client in `frontend/src/services/api.js`.
- [x] Live HTTP communication verified in real browser sessions.

### Completed in Phase 3 (Database Foundation):
- [x] Dedicated MongoDB connection layer in `backend/config/db.js` using Mongoose 8.
- [x] Express startup sequence connects database before listening (`backend/server.js`).
- [x] Extended health endpoint `GET /api/health` accurately distinguishes backend status from database status (`connected`, `disconnected`, `not_configured`).
- [x] Truthful reporting: Degraded mode reported when MongoDB is unavailable; never reports connected without active connection.
- [x] Automated test suites in backend and frontend passing.

### Completed in Phase 4 (Pixel-Accurate Dashboard UI):
- [x] Screenshot-matched dashboard layout with dark navy sidebar, search bar, and user profile header.
- [x] Real-time MongoDB connection indicator badge (`DB Connected`).
- [x] 4 Key Performance Indicator (KPI) summary cards (Dead Stock Value, Recovery Potential, Total SKUs, Clearance Rate).
- [x] Recharts Inventory Overview (Area chart) and Stock Status Breakdown (Donut chart).
- [x] Interactive Dead Stock Table with severity indicators, holding days, and recommended discounts.
- [x] Quick Actions panel, 7-Day Liquidation Action Plan preview, and WhatsApp Offer Preview modal.

### Completed in Phase 5 (Smart Inventory Management — Full-Stack):
- [x] **Product Model & Schema (`Product.model.js`):** Comprehensive schema with validation, SKU unique index, virtuals (`inventoryCostValue`, `potentialSalesValue`, `estimatedGrossProfit`, `grossMarginPercent`).
- [x] **Product Controller & Routes (`product.controller.js`, `product.routes.js`):** Full CRUD, pagination, filtering by category and search, automated financial metrics aggregation (`/api/products/summary`).
- [x] **CSV Ingestion & Export (`csv.service.js`):** Two-step CSV import with preview validation, header checking, row-level validation, batch ingestion, and filtered CSV export.
- [x] **Frontend Inventory Page (`InventoryPage.jsx`):** Real-time inventory table, search, category filter, sort, dynamic summary metric cards directly connected to backend.
- [x] **Slide-Over Product Form Modal (`ProductFormModal.jsx`):** Add/edit product drawer with comprehensive client-side validation and error feedback.
- [x] **Delete Confirmation Dialog (`DeleteConfirmDialog.jsx`):** Two-step verification dialog displaying item details and cost implications before deletion.
- [x] **CSV Import Modal (`CsvImportModal.jsx`):** Drag-and-drop file upload, pre-import preview table, validation report, and single-click commit.
- [x] **Automated Testing Suite:** 39 passing backend tests (including live DB integration tests) and 7 frontend service tests.

### Completed in Phase 6 (Dead Stock Detection, Risk Scoring & Explainability Engine):
- [x] **Configurable Stock-Age Classification (`deadStock.config.js`):** UTC midnight normalized date math; boundaries: Healthy (0–29d), Slow Moving (30–59d), At Risk (60–90d), Critical Dead Stock (>90d), and Insufficient Sales Data.
- [x] **Missing & Future Date Handling:** Missing, null, or future `lastSaleDate` records safely assigned to "Insufficient sales data" status; never falsely labeled dead stock.
- [x] **Deterministic Risk Scoring (0–100):** Weighted multi-factor model (Stock Age up to 55 pts, Capital Held up to 25 pts, Held Quantity up to 10 pts, Expiry Proximity up to 10 pts). Returns component score breakdown and evidence reason codes.
- [x] **Explainable Next Steps:** Contextual, rule-based recommendations tailored by classification, capital exposure, and supplier agreements without making speculative sales promises.
- [x] **Data Completeness Auditor:** Real-time data fidelity score assessing presence of last sale date, cost, price, supplier, condition, and velocity records.
- [x] **REST API Endpoints:** `GET /api/analysis/dead-stock` (paginated, filtered by category/classification/severity, sorted) and `GET /api/analysis/dead-stock/summary` (aggregated portfolio metrics and top priority dead stock).
- [x] **Live Dashboard Integration:** Dashboard Dead Stock Priority Table, Stock Status breakdown donut chart, and KPI summary cards dynamically populated from live MongoDB data.
- [x] **Dedicated Analysis Interface (`DeadStockAnalysisPage.jsx`):** Interactive analysis table with filter pills, severity selectors, and deep-dive Explainability drawer.
- [x] **Testing & Build Verification:** 60 backend unit & integration tests passing; 9 frontend service tests passing; Vite production build passing with 0 errors.

### Completed in Phase 7 (Profit-Safe Dynamic Discount Optimization Engine):
- [x] **Mathematical Margin Safeguards (`discount.service.js`):** Deterministic floor formulas protecting retailers against loss-making markdowns. Minimum price floor: $P_{\min} = (C + V) / (1 - M)$ for target margin and $P_{\min} = C + V + G$ for target profit.
- [x] **Unsafe Proposal Detection & Shortfall Analytics:** Identifies sub-floor proposals, computes per-unit and batch shortfalls, generates warnings, and calculates the absolute maximum safe discount percentage ($D_{\max}$).
- [x] **Product-Specific AI Clearance Recommendations:** Automatically derives optimal discount markdowns matching Phase 6 dead stock severity (Healthy: 0%, Slow Moving: 10%, At Risk: 20%, Critical Dead Stock: up to 35% capped strictly at margin floor). Urgency escalates for items near expiry.
- [x] **REST API Endpoints:** `POST /api/discounts/calculate`, `POST /api/discounts/minimum-price`, `POST /api/discounts/recommend`, and `GET /api/discounts/health`.
- [x] **Dashboard Integration (`DiscountCalculatorCard.jsx`):** Compact, screenshot-faithful widget on the main dashboard providing instant profit simulation, margin floor protection, and one-click "Set to Max Safe" action.
- [x] **Dedicated Full Workspace (`DiscountCalculatorPage.jsx`):** Full-screen optimizer with live product selector, slider controls, real-time breakeven breakdown, and one-click triggers from the active inventory catalog.
- [x] **Contextual Optimizer Modal (`DiscountCalculatorModal.jsx`):** Interactive deep-dive modal launchable directly from the Dead Stock Priority Table and Dead Stock Analysis view for seamless workflow continuity.
- [x] **Phase 11: Secure Multi-Merchant Authentication, Data Isolation & Cloud Deployment:**
  - Secure merchant registration and login with bcrypt password hashing (10 rounds) and normalized email addresses.
  - Multi-tenant data ownership: inventory products, dead-stock analysis, discount calculations, 7-day recovery plans, and WhatsApp campaigns strictly scoped by server-authenticated `merchantId`.
  - Scoped unique SKU indexing (`{ sku: 1, merchantId: 1 }`): different retailers can use identical SKUs without conflict.
  - Cross-tenant intrusion rejection: cross-store resource lookups return `404 Not Found` without disclosing existence.
  - Frontend authentication: modern dark-aesthetic `AuthPage.jsx` with store registration, validation, error banners, loading states, demo accounts, and protected navigation via `AuthContext.jsx`.
  - TopHeader merchant badge with owner name, store name, dynamic initials avatar, and clean logout action.
  - Controlled legacy data audit & migration utility (`backend/scripts/migrateLegacyData.js`) supporting `--status`, `--dry-run`, and safe `--assign-to` with automated JSON backups.
  - 100% test pass rate: 179 backend tests passed across 45 suites, 28 frontend tests passed across 6 suites, and Vite production bundle built successfully.

---

## 7. Quick Start Guide

### Step 1: Start the Backend API
In your first terminal window:
```bash
cd StockSaathi-AI/backend
npm run dev
```

### Step 2: Start the Frontend Application
In your second terminal window:
```bash
cd StockSaathi-AI/frontend
npm run dev
```
- **Frontend Application URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API URL:** [http://localhost:5001](http://localhost:5001)
- **Health & DB Check Endpoint:** [http://localhost:5001/api/health](http://localhost:5001/api/health)
- **Merchant Register Endpoint:** [http://localhost:5001/api/auth/register](http://localhost:5001/api/auth/register)
- **Merchant Login Endpoint:** [http://localhost:5001/api/auth/login](http://localhost:5001/api/auth/login)
- **Merchant Profile Endpoint:** [http://localhost:5001/api/auth/me](http://localhost:5001/api/auth/me)

---

## 8. Required Environment Variables

Configure these variable names in your `.env` files (never commit real secret values):

### Backend (`backend/.env`)
- `PORT` (e.g. `5001` or `5000`)
- `NODE_ENV` (`development` or `production`)
- `MONGODB_URI` (MongoDB connection URI)
- `JWT_SECRET` (Cryptographically strong signing secret)
- `JWT_EXPIRES_IN` (e.g. `7d` or `24h`)
- `COOKIE_SECRET` (Cookie parsing secret)
- `FRONTEND_URL` / `ALLOWED_ORIGINS` (Allowed origin URL, e.g. `http://localhost:5173` or your production frontend domain)

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` (e.g. `http://localhost:5001/api` or your deployed backend `/api`)

---

## 9. Legacy Data Migration Procedure

Before registering production merchants, unassigned legacy records can be safely audited and migrated without deleting or blindly reassigning data:

```bash
cd StockSaathi-AI/backend

# Step 1: Audit unassigned legacy records
node scripts/migrateLegacyData.js --status

# Step 2: Perform a dry-run migration to preview changes
node scripts/migrateLegacyData.js --assign-to "admin@stocksaathi.ai" --dry-run

# Step 3: Execute safe migration (automatically creates a timestamped JSON backup in backend/backups/)
node scripts/migrateLegacyData.js --assign-to "admin@stocksaathi.ai"
```

---

## 10. Automated Test Commands

### Run Backend Tests (179 tests across 45 suites)
```bash
cd StockSaathi-AI/backend
npm test
```

### Run Frontend Unit Tests (28 tests across 6 suites)
```bash
cd StockSaathi-AI/frontend
npm test
```

### Run Frontend Production Build
```bash
cd StockSaathi-AI/frontend
npm run build
```

