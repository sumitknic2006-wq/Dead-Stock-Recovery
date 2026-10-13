# Testing Guide — StockSaathi AI

## Testing Strategy

### Backend Automated Tests
The backend test suite uses Node.js native test runner (`node:test` and `node:assert`) for zero-dependency, high-speed test execution.

To execute backend tests:
```bash
cd backend
npm test
```

#### Test Suites:
1. **Health Check & CORS (`tests/health.test.js`):**
   - Validates `GET /api/health` returns `status: "ok"` and `database.status: "connected"` when database is connected.
   - Validates `GET /api/health` returns `status: "degraded"` and `database.status: "not_configured"` when database is unset.
   - Validates `404 Not Found` response contract on undefined routes.
   - Validates CORS header attachment for Vite origin (`http://localhost:5173`).
   - Validates CORS preflight `OPTIONS` requests.
   - Validates CORS rejection for unauthorized cross-origin requests.

2. **Database Connection Module (`tests/db.test.js`):**
   - Validates `getDatabaseStatus()` reports `not_configured` when `MONGODB_URI` is unset.
   - Validates `getDatabaseStatus()` reflects real Mongoose `readyState` (connected, disconnected, connecting).
   - Validates `connectDB()` handles missing `MONGODB_URI` safely without crashing.
   - Validates `connectDB()` fails and rejects on unreachable or invalid database hosts without exposing credentials.
   - Validates `connectDB()` prevents duplicate connection instantiation.

3. **Product Inventory Management (`tests/product.test.js`):**
   - Server-side validation for negative prices, invalid dates, fractional quantities, and missing fields.
   - Live MongoDB CRUD operations: Product creation, paginated listing, name search, category filter, update, and deletion.
   - Rejection of duplicate SKUs (409 Conflict).
   - Real-time financial aggregation (`/api/products/summary`).
   - Two-step CSV parsing, header verification, and row-level validation.

4. **Dead Stock Analysis & Risk Scoring Engine (`tests/deadStock.test.js`):**
   - Stock-age boundaries: Healthy (0 & 29d), Slow Moving (30 & 59d), At Risk (60 & 90d), Critical Dead Stock (91d+).
   - Safe handling of missing, future, and invalid `lastSaleDate` without false dead-stock classification.
   - Accurate stock age calculation across month and year boundaries.
   - Safe computation for zero quantity and zero purchase cost without NaN.
   - Accurate calculation of inventory cost value, potential sales value, and estimated gross profit.
   - Deterministic risk scoring (0–100 range) and explainable component breakdowns.
   - Generation of actionable next steps and evidence reason codes.
   - Unstandardized velocity data flagging.
   - REST API search, category filtering, sorting, pagination, and empty-database behavior.
   - 503 degraded error response on database disconnection.

5. **Profit-Safe Dynamic Discount Optimization Engine (`tests/discount.test.js`):**
   - Correct calculation with normal selling prices and discounted selling prices.
   - Exact gross profit per unit and gross margin percentage calculations.
   - Minimum acceptable selling price floors for target profit ($C + V + G$) and target margin ($(C + V) / (1 - M)$).
   - Maximum safe discount calculation.
   - Unsafe proposal detection, shortfall calculation, and financial warning alerts.
   - Edge case handling: zero discount, 100% discount, zero selling price, and negative gross profit.
   - Strict validation: rejection of target margins $\ge 100\%$, negative costs, negative quantities, invalid product IDs, and non-finite inputs ($NaN$, $\pm\infty$).
   - MongoDB integration: 404 for missing products, 400 when requested quantity exceeds available stock.
   - Deterministic explainable recommendations with reason codes and data limitations.
   - 503 degraded error response on database disconnection.

6. **7-Day Dead Stock Recovery Action Planner (`tests/recovery.test.js`):**
   - Seven-day date boundary sequence and UTC midnight calendar calculations (Days 1–7).
   - Risk-based action scheduling: Critical Dead Stock prioritized for Day 1 cash recovery; At Risk items prioritized for bundles and VIP outreach.
   - Price floor enforcement: proposed clearance prices strictly $\ge P_{\min}$ under both profit and margin constraints.
   - Non-discount fallback: products with 0% safe discount capacity assigned merchandising display or bundle actions.
   - Distinct differentiation of inventory cost exposure, potential sales value, and conservative estimated recovery value.
   - Plan regeneration and completed-action preservation policy: completed actions, notes, and timestamps retained by default.
   - Force-reset mechanism: archives previous plan and creates an entirely fresh pending schedule.
   - Action status lifecycle: transitions across `pending` $\rightarrow$ `in_progress` $\rightarrow$ `completed` $\rightarrow$ `skipped` with audit timestamps.
   - Progress percentage and recovered value accumulation calculations.
   - Input validation: rejection of invalid ObjectIds, non-ISO dates, out-of-range days, and unknown statuses.
   - Degraded API response (503) on MongoDB disconnection.
   - Full regression suite confirming Phase 1–7 endpoints remain fully operational.

7. **Personalized WhatsApp Clearance Campaign Generator (`tests/campaign.test.js`):**
   - Multilingual generation across English, Hindi, and Hinglish.
   - Campaign types: `flash_sale`, `clearance`, `bundle_offer`, and `near_expiry`.
   - Tones: `friendly`, `urgent`, and `professional`.
   - Price floor enforcement: rejects proposals where discounted price < minimum safe floor ($P_{\min}$).
   - Actionable error details: returns maximum safe discount and minimum acceptable selling price when rejected.
   - Zero-discount campaigns allowed for non-discount promotional notifications.
   - Input validation: rejects invalid ObjectIds, invalid campaign types, invalid languages, invalid tones, and missing required parameters.
   - Persistence: saves drafts in MongoDB Atlas with product snapshot and pricing metadata.
   - Paginated retrieval and query filtering by `status`, `campaignType`, `language`, and `productId`.
   - Draft editing via PATCH with partial update verification.
   - Archiving via POST `/api/campaigns/:id/archive` without data loss.
   - Health reporting via GET `/api/campaigns/health` and 503 degraded error handling.
   - Complete regression suite confirming Phase 1–8 endpoints remain functional.

8. **Full-System Integration & E2E Workflows (`tests/integration.test.js`):**
   - **Workflow A (Inventory):** Product creation with margin constraints, duplicate SKU rejection (409 Conflict), and inventory summary metrics aggregation.
   - **Workflow B (Dead Stock Analysis):** Accurate detection of 95-day stagnant product, classification as `critical_dead_stock`, and explainable risk scoring.
   - **Workflow C (Profit-Safe Discounts):** Minimum price floor calculation ($P_{\min}$), rejection of unsafe markdowns with warning feedback, and approval of profit-safe proposals.
   - **Workflow D (7-Day Recovery Planner):** 7-day action scheduling with price floor enforcement, action status progression (`pending` $\rightarrow$ `completed`), and summary accumulation.
   - **Workflow E (WhatsApp Campaign Generator):** Multilingual promotional draft generation with safe pricing, draft message modification via PATCH, and non-destructive archiving.

9. **Merchant Authentication & Account Security (`tests/auth.test.js`):**
   - Registration validation: requires valid email and minimum 8-character password.
   - Password hashing: passwords hashed using bcrypt, plaintext never stored or returned in responses.
   - Duplicate prevention: duplicate normalized emails rejected with 409 Conflict.
   - Login authentication: valid credentials issue signed JWT tokens and set HttpOnly cookies.
   - Generic failure: invalid credentials rejected with generic 401 error disclosing no account existence.
   - Protected access: `GET /api/auth/me` validates token and returns active merchant profile; invalid/expired tokens return 401.
   - Logout behavior: `POST /api/auth/logout` clears HttpOnly cookie.

10. **Multi-Merchant Tenancy & Data Isolation (`tests/tenantIsolation.test.js`):**
   - **Unauthenticated Protection:** Rejects unauthenticated requests with 401 across Products, Analysis, Recovery, and Campaigns.
   - **Inventory Isolation:** Products created by Merchant Alpha return 404 Not Found to Merchant Beta; Merchant Beta cannot update or delete Alpha's inventory.
   - **Scoped Unique SKUs:** Compound `{ sku: 1, merchantId: 1 }` allows different merchants to use identical SKUs, while forbidding duplicates within the same merchant.
   - **Ownership Spoofing Prevention:** Malicious `merchantId` payloads in request bodies are ignored in favor of verified `req.merchant.id`.
   - **Dashboard Summary Isolation:** Inventory cost totals and SKU counts are strictly scoped by merchant.
   - **Analysis & Discount Isolation:** Dead stock scoring, price floor checks, and discount recommendations only process merchant-owned items.
   - **Recovery & Campaign Isolation:** Merchants cannot view, generate, update, or archive each other's 7-day plans or WhatsApp campaigns.

### Frontend Automated Tests
To execute frontend tests:
```bash
cd frontend
npm test
```
- Validates `apiRequest` JSON parsing, custom `ApiError` throwing, Bearer token injection, and 401 unauthorized session expiry handling in `api.test.js`.
- Validates `registerMerchant()`, `loginMerchant()`, `logoutMerchant()`, and `getMerchantProfile()` in `authApi.test.js`.
- Validates `fetchDeadStockSummary()` and `fetchDeadStockAnalysis()` query parameter serialization in `analysisApi.test.js`.
- Validates `calculateProposedDiscount()`, `calculateMinimumSafePrice()`, `fetchDiscountRecommendation()`, and `getDiscountEngineHealth()` in `discountApi.test.js`.
- Validates `getActiveRecoveryPlan()`, `getRecoverySummary()`, `generateRecoveryPlan()`, `updateRecoveryActionStatus()`, and `getRecoveryHealth()` in `recoveryApi.test.js`.
- Validates `generateCampaign()`, `fetchCampaigns()`, `fetchCampaignById()`, `updateCampaign()`, `archiveCampaign()`, and `getCampaignHealth()` in `campaignApi.test.js`.

### Frontend Production Build Verification
```bash
cd frontend
npm run build
```
Ensures JSX builds into production-ready static assets without bundling or lint errors.

### Test Results (Phase 11)
- **Backend Test Suite:** 179 Passed, 0 Failed, 1 Skipped (100% Pass Rate).
- **Frontend Test Suite:** 28 Passed, 0 Failed (100% Pass Rate).
- **Production Build:** `dist/index.html` (0.57 kB), `dist/assets/index.css` (46.97 kB), `dist/assets/index.js` (832 kB). Verified.


