# API Documentation — StockSaathi AI

## Base URL
- **Local Development:** `http://localhost:5001/api` (Default on macOS when port 5000 is occupied by AirPlay) or `http://localhost:5000/api`
- **Root Discovery:** `http://localhost:5001/`

---

## Active Endpoints

### 1. Root Endpoint
- **Method:** `GET`
- **Path:** `/`
- **Description:** Returns API discovery metadata and service identifier.
- **Response `200 OK`:**
  ```json
  {
    "name": "StockSaathi AI API",
    "tagline": "Recover Cash. Protect Profit. Grow Smarter.",
    "version": "1.0.0 (Phase 11 - Secure Multi-Merchant)",
    "endpoints": {
      "health": "/api/health",
      "authRegister": "/api/auth/register",
      "authLogin": "/api/auth/login",
      "authLogout": "/api/auth/logout",
      "authMe": "/api/auth/me"
    }
  }
  ```

---

## Merchant Authentication (`/api/auth`)

All merchant accounts use secure password hashing (bcrypt), normalized lowercase emails, and signed JWT authentication tokens. Tokens are transmitted either via `Authorization: Bearer <token>` header or `stocksaathi_auth_token` HttpOnly cookie.

### 2. Merchant Registration
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Access:** Public
- **Payload:**
  ```json
  {
    "email": "retailer@kirana.store",
    "password": "Password123!",
    "name": "Rajesh Sharma",
    "businessName": "Sharma Kirana Store",
    "storeCategory": "Grocery & Kirana"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Merchant registered successfully",
    "data": {
      "merchant": {
        "id": "670ab123456789abcdef0123",
        "name": "Rajesh Sharma",
        "email": "retailer@kirana.store",
        "businessName": "Sharma Kirana Store",
        "storeCategory": "Grocery & Kirana",
        "role": "merchant",
        "status": "active"
      },
      "token": "<jwt-token>"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (short password, invalid email format, missing fields).
  - `409 Conflict`: Normalized email address already registered.

### 3. Merchant Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Access:** Public
- **Payload:**
  ```json
  {
    "email": "retailer@kirana.store",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "merchant": {
        "id": "670ab123456789abcdef0123",
        "name": "Rajesh Sharma",
        "email": "retailer@kirana.store",
        "businessName": "Sharma Kirana Store",
        "role": "merchant"
      },
      "token": "<jwt-token>"
    }
  }
  ```
- **Error Response `401 Unauthorized`:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid email or password",
      "statusCode": 401
    }
  }
  ```

### 4. Current Authenticated Merchant Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Access:** Protected (`requireAuth`)
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "670ab123456789abcdef0123",
      "name": "Rajesh Sharma",
      "email": "retailer@kirana.store",
      "businessName": "Sharma Kirana Store",
      "role": "merchant",
      "status": "active"
    }
  }
  ```
- **Error Response `401 Unauthorized`:** When token is absent, invalid, or expired.

### 5. Merchant Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Access:** Public
- **Response `200 OK`:** Clears HttpOnly cookie and instructs client to purge in-memory session.

---

### 6. Health & Database Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Description:** Returns the live operational status, uptime, current environment, and MongoDB connection status.
- **Database States:** `connected`, `disconnected`, `not_configured`

#### Scenario A: Backend & Database Online
- **HTTP Status:** `200 OK`
- **Payload:**
  ```json
  {
    "status": "ok",
    "message": "StockSaathi AI Backend and Database are running smoothly",
    "timestamp": "2026-10-12T12:20:00.000Z",
    "uptime": 45,
    "environment": "development",
    "database": {
      "status": "connected"
    }
  }
  ```

#### Scenario B: Backend Online, Database Not Configured / Disconnected (Degraded)
- **HTTP Status:** `200 OK`
- **Payload:**
  ```json
  {
    "status": "degraded",
    "message": "StockSaathi AI Backend is running (Database is not connected)",
    "timestamp": "2026-10-12T12:20:00.000Z",
    "uptime": 12,
    "environment": "development",
    "database": {
      "status": "not_configured"
    }
  }
  ```

> **Security Guarantee:** Connection strings, passwords, usernames, and internal credentials are NEVER exposed in the health response or error envelopes.

### 3. Inventory Management Endpoints (Phase 5)

#### 3.1 Get Paginated Products
- **Method:** `GET`
- **Path:** `/api/products`
- **Query Params:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `search` (string, filter by name or SKU)
  - `category` (string, filter by category)
  - `sortBy` (string, field name, default: `dateAdded`)
  - `order` (`asc` | `desc`, default: `desc`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "6acc983fb46003b7a541375e",
        "name": "Wireless Bluetooth Headphones Pro",
        "sku": "AUDIO-HP-09",
        "category": "Audio & Sound",
        "purchaseCost": 1200,
        "sellingPrice": 2499,
        "quantity": 42,
        "inventoryCostValue": 50400,
        "potentialSalesValue": 104958,
        "estimatedGrossProfit": 54558,
        "grossMarginPercent": 51.98
      }
    ],
    "pagination": {
      "total": 6,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 3.2 Get Single Product
- **Method:** `GET`
- **Path:** `/api/products/:id`
- **Response `200 OK`:** Product object with computed virtual fields.

#### 3.3 Create Product
- **Method:** `POST`
- **Path:** `/api/products`
- **Body:** JSON object (`name`, `sku`, `category`, `purchaseCost`, `sellingPrice`, `quantity`, etc.)
- **Response `201 Created`:** Created product object.
- **Error `409 Conflict`:** If SKU already exists in database.
- **Error `422 Unprocessable Entity`:** Validation failure with array of offending fields.

#### 3.4 Update Product
- **Method:** `PUT`
- **Path:** `/api/products/:id`
- **Body:** JSON object with updated fields.
- **Response `200 OK`:** Updated product object.

#### 3.5 Delete Product
- **Method:** `DELETE`
- **Path:** `/api/products/:id`
- **Response `200 OK`:** `{ "success": true, "data": { "deleted": true, "id": "..." } }`

#### 3.6 Aggregated Inventory Summary
- **Method:** `GET`
- **Path:** `/api/products/summary`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "totalProducts": 6,
      "totalUnitsInStock": 270,
      "totalInventoryCostValue": 213850,
      "potentialSalesValue": 455430,
      "estimatedGrossProfit": 241580,
      "note": "Inventory cost value = purchaseCost × quantity. Potential sales value = sellingPrice × quantity. Estimated gross profit is at listed prices only and excludes operating expenses. None of these are actual realised cash."
    }
  }
  ```

#### 3.7 CSV Import Preview & Commit
- **Preview:** `POST /api/products/csv/preview` (multipart/form-data with `file`) — Validates headers, rows, detects duplicate SKUs, returns preview rows without saving to DB.
- **Commit:** `POST /api/products/csv/import` (multipart/form-data with `file`) — Ingests valid rows into MongoDB, skips duplicates safely, returns summary.
- **Export:** `GET /api/products/csv/export?category=...&search=...` — Downloads CSV file matching current active filters.

---

### 4. Dead Stock Analysis & Risk Scoring Endpoints (Phase 6)

#### 4.1 Paginated Dead Stock Analysis
- **Method:** `GET`
- **Path:** `/api/analysis/dead-stock`
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `search` (string, filters product name or SKU)
  - `category` (string, filter by exact category)
  - `classification` (string: `healthy` | `slow_moving` | `at_risk` | `critical_dead_stock` | `insufficient_data`)
  - `severity` (string: `Low` | `Medium` | `High` | `Critical`)
  - `sortBy` (string: `daysSinceLastSale` | `riskScore` | `inventoryCostValue` | `quantity` | `name`)
  - `order` (`asc` | `desc`, default: `desc`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "productId": "6acc983fb46003b7a5413762",
        "name": "Aluminum Ergonomic Laptop Stand",
        "sku": "ACC-LS-04",
        "category": "Office & Desk",
        "quantity": 35,
        "purchaseCost": 550,
        "sellingPrice": 1299,
        "inventoryCostValue": 19250,
        "potentialSalesValue": 45465,
        "estimatedGrossProfit": 26215,
        "grossMarginPercent": 57.66,
        "lastSaleDate": "2024-05-15T00:00:00.000Z",
        "daysSinceLastSale": 880,
        "stockAgeStatus": "VALID",
        "classification": {
          "key": "critical_dead_stock",
          "label": "Critical Dead Stock"
        },
        "riskScore": 73,
        "severity": "High",
        "isProvisional": false,
        "componentScores": {
          "age": 55,
          "capital": 10,
          "quantity": 8,
          "expiry": 0
        },
        "reasonCodes": ["CRITICAL_STAGNANCY", "HIGH_QUANTITY_HELD"],
        "recommendations": [
          {
            "title": "Prioritize Liquidation Action",
            "description": "Conduct urgent stock review. Formulate a targeted clearance plan.",
            "priority": "Urgent",
            "rationale": "Inactive for 880 days (>90d threshold). ₹19,250 capital is currently stagnant."
          }
        ],
        "dataCompleteness": {
          "completenessScore": 100
        }
      }
    ],
    "pagination": {
      "total": 6,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 4.2 Dead Stock Portfolio Summary
- **Method:** `GET`
- **Path:** `/api/analysis/dead-stock/summary`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalProducts": 7,
        "totalUnits": 320,
        "totalInventoryCostValue": 214850,
        "totalPotentialSalesValue": 456930,
        "classifications": {
          "healthy": { "count": 0, "costValue": 0, "units": 0 },
          "slow_moving": { "count": 0, "costValue": 0, "units": 0 },
          "at_risk": { "count": 0, "costValue": 0, "units": 0 },
          "critical_dead_stock": { "count": 6, "costValue": 213850, "units": 270 },
          "insufficient_data": { "count": 1, "costValue": 1000, "units": 50 }
        },
        "severities": {
          "Low": 1,
          "Medium": 0,
          "High": 2,
          "Critical": 4
        },
        "deadStockTotalCostValue": 213850,
        "deadStockTotalUnits": 270,
        "atRiskTotalCostValue": 0
      },
      "topPriorityItems": [...]
    }
  }
  ```

### 5. Profit-Safe Discount Optimization Endpoints (Phase 7)

#### A. Calculate Proposed Discount
- **Method:** `POST`
- **Path:** `/api/discounts/calculate`
- **Description:** Evaluates margin safety and financial results for a proposed discount.
- **Request Body:**
  ```json
  {
    "productId": "6732f143a9...",
    "purchaseCost": 1000,
    "sellingPrice": 2000,
    "variableCostPerUnit": 0,
    "quantity": 5,
    "constraintType": "minimum_margin",
    "minimumGrossMarginPercent": 20,
    "discountPercent": 20
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "isSafe": true,
      "financialWarning": null,
      "originalSellingPrice": 2000,
      "proposedSellingPrice": 1600,
      "minimumAcceptablePrice": 1250,
      "maximumSafeDiscountPercent": 37.5,
      "discountAmountPerUnit": 400,
      "discountPercent": 20,
      "quantity": 5,
      "proposedGrossProfitPerUnit": 600,
      "proposedGrossMarginPercent": 37.5,
      "totalCostOfGoods": 5000,
      "expectedGrossSalesValue": 8000,
      "expectedTotalGrossProfit": 3000,
      "reasonCodes": ["OFFER_PROFIT_SAFE"],
      "explanation": "The proposed discount of 20% (₹1600.00) preserves your target margin floor of 20.0% (minimum safe price: ₹1250.00)."
    }
  }
  ```

#### B. Calculate Minimum Safe Selling Price
- **Method:** `POST`
- **Path:** `/api/discounts/minimum-price`
- **Description:** Calculates absolute price floor and maximum safe markdown.
- **Request Body:**
  ```json
  {
    "purchaseCost": 1200,
    "variableCostPerUnit": 50,
    "sellingPrice": 2400,
    "constraintType": "minimum_profit",
    "minimumDesiredProfitPerUnit": 300
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "purchaseCost": 1200,
      "variableCostPerUnit": 50,
      "totalUnitCost": 1250,
      "minimumAcceptablePrice": 1550,
      "currentSellingPrice": 2400,
      "maximumSafeDiscountPercent": 35.42,
      "targetUnachievableAtListPrice": false
    }
  }
  ```

#### C. Smart Product Discount Recommendation
- **Method:** `POST`
- **Path:** `/api/discounts/recommend`
- **Description:** Formulates a deterministic, explainable clearance discount based on Phase 6 dead stock classification and margin constraints.
- **Request Body:**
  ```json
  {
    "productId": "6732f143a9...",
    "constraintType": "minimum_margin",
    "minimumGrossMarginPercent": 20
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "product": {
        "id": "6732f143a9...",
        "name": "Wireless Bluetooth Headphones Pro",
        "sku": "AUDIO-HP-09",
        "purchaseCost": 1200,
        "sellingPrice": 2499,
        "stockQuantity": 42
      },
      "analysis": {
        "classification": "critical_dead_stock",
        "daysSinceLastSale": 120,
        "riskScore": 75,
        "riskSeverity": "Critical"
      },
      "recommendation": {
        "recommendedDiscountPercent": 35,
        "recommendedSellingPrice": 1624.35,
        "minimumAcceptableSellingPrice": 1500,
        "maximumSafeDiscountPercent": 39.98,
        "expectedGrossProfitPerUnit": 424.35,
        "expectedGrossMarginPercent": 26.12,
        "expectedTotalGrossProfit": 17822.7,
        "expectedGrossSalesValue": 68222.7,
        "isSafe": true,
        "reasonCodes": ["DEAD_STOCK_CLEARANCE_DISCOUNT", "PROFIT_SAFE"],
        "explanation": "Critical dead stock (120 days since last sale). Recommended aggressive clearance markdown of 35% to unlock liquid cash without incurring an operating loss."
      }
    }
  }
  ```

#### D. Discount Engine Health
- **Method:** `GET`
- **Path:** `/api/discounts/health`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "engine": "profit-safe-discount-optimization",
    "status": "ok",
    "version": "1.0.0 (Phase 7)",
    "database": "connected"
  }
  ```

### 6. Phase 8 — 7-Day Dead Stock Recovery Action Planner (`/api/recovery`)

#### A. Retrieve Active 7-Day Plan
- **Method:** `GET`
- **Path:** `/api/recovery/plan`
- **Query Parameters (optional):**
  - `day` (integer `1..7`): Filter actions for a specific day.
  - `status` (`pending` | `in_progress` | `completed` | `skipped`): Filter actions by status.
  - `priority` (`low` | `medium` | `high` | `critical`): Filter actions by priority.
- **Description:** Returns the active 7-day recovery action plan. If no active plan exists, one is automatically generated using live inventory.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "6accff7eb34bf8366c9439c6",
      "planTitle": "7-Day Cash Recovery Action Plan",
      "startDate": "2026-10-12T00:00:00.000Z",
      "endDate": "2026-10-18T00:00:00.000Z",
      "status": "active",
      "targetRecoveryRatePercent": 159.51,
      "totalCostExposure": 214850,
      "estimatedTotalRecoveryValue": 342697.5,
      "actions": [
        {
          "_id": "6accff7eb34bf8366c9439c7",
          "day": 1,
          "plannedActionDate": "2026-10-12T00:00:00.000Z",
          "productId": "6acc983fb46003b7a541375f",
          "productName": "Smart Fitness Band v2 Black",
          "sku": "WEAR-FB-22",
          "category": "Wearables",
          "actionType": "profit_safe_clearance",
          "title": "Day 1: Flash Clearance Launch: High-Risk Dead Stock",
          "instructions": "Launch a profit-safe 48-hour flash clearance offer for this high-risk item. Feature prominently in digital messaging and at front-of-store display. Target Product: Smart Fitness Band v2 Black (SKU: WEAR-FB-22).",
          "suggestedDiscountPercent": 25,
          "proposedSellingPrice": 2249.25,
          "minimumSafePrice": 1437.5,
          "quantity": 14,
          "inventoryCostValue": 17500,
          "expectedRecoveryValue": 23617.13,
          "priority": "critical",
          "reasonCodes": ["AGE_OVER_90_DAYS", "CRITICAL_CAPITAL_EXPOSURE"],
          "rationale": "Critical dead stock with high capital tie-up requires immediate cash conversion before further depreciation.",
          "status": "pending",
          "completedAt": null,
          "notes": ""
        }
      ]
    }
  }
  ```

#### B. Retrieve Recovery Summary & Progress Metrics
- **Method:** `GET`
- **Path:** `/api/recovery/summary`
- **Description:** Returns aggregate plan progress, daily action breakdowns, total capital exposure, and actual cash recovered from completed actions.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "planId": "6accff7eb34bf8366c9439c6",
      "planTitle": "7-Day Cash Recovery Action Plan",
      "status": "active",
      "startDate": "2026-10-12T00:00:00.000Z",
      "endDate": "2026-10-18T00:00:00.000Z",
      "daysRemaining": 6,
      "totalActions": 7,
      "completedActions": 1,
      "inProgressActions": 0,
      "pendingActions": 6,
      "skippedActions": 0,
      "progressPercentage": 14.29,
      "totalCostExposure": 214850,
      "estimatedTotalRecoveryValue": 342697.5,
      "actualRecoveredValue": 78718.5,
      "targetRecoveryRatePercent": 159.51,
      "dailyBreakdown": [
        { "day": 1, "totalActions": 1, "completed": 0, "inProgress": 0, "pending": 1, "skipped": 0, "status": "active" },
        { "day": 2, "totalActions": 1, "completed": 1, "inProgress": 0, "pending": 0, "skipped": 0, "status": "completed" }
      ]
    }
  }
  ```

#### C. Generate or Regenerate 7-Day Plan
- **Method:** `POST`
- **Path:** `/api/recovery/plan/generate`
- **Request Body (optional):**
  ```json
  {
    "startDate": "2026-10-13",
    "preserveCompleted": true,
    "forceReset": false
  }
  ```
- **Preservation Policy:**
  - `preserveCompleted: true` (default): Completed and in-progress actions from the active plan are retained with their timestamps and retailer notes. Only pending or future actions are updated with fresh inventory classifications and Phase 7 price floors.
  - `forceReset: true`: Archives the existing plan and generates an entirely clean 7-day schedule with all actions set to `pending`.
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "7-Day Dead Stock Recovery Action Plan generated successfully",
    "data": { ... }
  }
  ```

#### D. Update Action Execution Status & Notes
- **Method:** `PATCH`
- **Path:** `/api/recovery/actions/:id/status`
- **Request Body:**
  ```json
  {
    "status": "completed",
    "notes": "Arranged display at front counter; cash unlocked."
  }
  ```
- **Allowed Statuses:** `pending`, `in_progress`, `completed`, `skipped`
- **Description:** Updates the execution state of an action subdocument. Transitioning to `completed` automatically records `completedAt: Date.now()`. Transitioning away clears `completedAt`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Action status updated successfully",
    "data": {
      "_id": "6accff7eb34bf8366c9439c8",
      "day": 2,
      "status": "completed",
      "completedAt": "2026-10-12T15:44:00.000Z",
      "notes": "Arranged display at front counter; cash unlocked."
    },
    "planStatus": "active"
  }
  ```

#### E. Recovery Service Health Check
- **Method:** `GET`
- **Path:** `/api/recovery/health`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "service": "recovery-planner",
    "version": "1.0.0",
    "phase": "Phase 8 — 7-Day Dead Stock Recovery Action Planner"
  }
  ```

---

### 7. WhatsApp Personalized Clearance Campaign Generator (Phase 9)

**Base Path:** `/api/campaigns`

#### A. Generate Profit-Safe Clearance Campaign
- **Method:** `POST`
- **Path:** `/api/campaigns/generate`
- **Description:** Generates a deterministic, multilingual WhatsApp promotional campaign for slow-moving, at-risk, or critical dead-stock products while strictly enforcing Phase 7 profit safeguards.
- **Request Body:**
  ```json
  {
    "productId": "65b2f8a91c4e2b0012a4b890",
    "campaignType": "clearance",
    "targetAudience": "repeat_customers",
    "language": "hinglish",
    "tone": "urgent",
    "discountPercent": 15,
    "customInstructions": "Offer valid till Sunday only"
  }
  ```
- **Validation Rules:**
  - `productId`: Required valid 24-character hexadecimal MongoDB ObjectId.
  - `campaignType`: Must be one of `flash_sale`, `clearance`, `bundle_offer`, `near_expiry`.
  - `targetAudience`: Must be one of `all_customers`, `repeat_customers`, `local_customers`, `custom`.
  - `language`: Must be one of `english`, `hindi`, `hinglish`.
  - `tone`: Must be one of `friendly`, `urgent`, `professional`.
  - `discountPercent`: Optional finite number between 0 and 100.
  - Price Safeguard: Proposed price ($P_{\text{proposed}}$) must never fall below minimum safe price ($P_{\min}$).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "campaign": {
      "_id": "670a8fbc...",
      "campaignName": "Clearance Offer — Wireless Headphones",
      "campaignType": "clearance",
      "productId": "65b2f8a9...",
      "productSnapshot": {
        "name": "Wireless Headphones",
        "sku": "ELEC-WH-001",
        "category": "Electronics",
        "quantity": 42,
        "sellingPrice": 2499,
        "purchaseCost": 1500
      },
      "targetAudience": "repeat_customers",
      "language": "hinglish",
      "tone": "urgent",
      "discountPercent": 15,
      "proposedSellingPrice": 2124,
      "minimumSafePrice": 1765,
      "message": "⚡ *SPECIAL CLEARANCE OFFER!* ⚡\n\nNamaste!...",
      "callToAction": "Limited stock remaining — reply directly or visit us to claim yours today!",
      "status": "draft",
      "createdAt": "2026-10-12T16:00:00.000Z",
      "updatedAt": "2026-10-12T16:00:00.000Z"
    },
    "pricing": {
      "sellingPrice": 2499,
      "discountPercent": 15,
      "proposedSellingPrice": 2124,
      "minimumSafePrice": 1765,
      "maxSafeDiscountPercent": 29.37,
      "isProfitSafe": true
    },
    "riskClassification": "at_risk",
    "reasonCodes": ["DISCOUNT_APPLIED", "PROFIT_SAFE_VALIDATED"]
  }
  ```

#### B. List Campaigns (Paginated & Filterable)
- **Method:** `GET`
- **Path:** `/api/campaigns`
- **Query Parameters:**
  - `status`: Optional filter (`draft`, `ready`, `archived`)
  - `campaignType`: Optional filter (`flash_sale`, `clearance`, `bundle_offer`, `near_expiry`)
  - `language`: Optional filter (`english`, `hindi`, `hinglish`)
  - `productId`: Optional filter by MongoDB ObjectId
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "campaigns": [ ... ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### C. Get Campaign by ID
- **Method:** `GET`
- **Path:** `/api/campaigns/:id`
- **Response `200 OK`:** Returns campaign object or 404 if not found.

#### D. Update Campaign Draft
- **Method:** `PATCH`
- **Path:** `/api/campaigns/:id`
- **Request Body (Partial):**
  ```json
  {
    "message": "Customized message text...",
    "tone": "friendly",
    "targetAudience": "all_customers",
    "status": "ready"
  }
  ```
- **Response `200 OK`:** Returns updated campaign document.

#### E. Archive Campaign
- **Method:** `POST`
- **Path:** `/api/campaigns/:id/archive`
- **Description:** Sets campaign status to `archived` without deleting historical record.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Campaign archived successfully",
    "campaign": {
      "_id": "670a8fbc...",
      "status": "archived"
    }
  }
  ```

#### F. Campaign Service Health Check
- **Method:** `GET`
- **Path:** `/api/campaigns/health`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "service": "campaign-generator",
    "version": "1.0.0",
    "phase": "Phase 9 — Personalized WhatsApp Clearance Campaign Generator",
    "database": {
      "status": "connected"
    }
  }
  ```

---

### 8. Unified Error Contracts
All unhandled errors and invalid payloads return structured responses:
- **`400 Bad Request`:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Requested discount violates profit safeguard floor",
      "statusCode": 400,
      "errors": ["Discount of 85% drops price (₹375) below minimum safe floor (₹1,765). Maximum safe discount is 29.37%."]
    }
  }
  ```
- **`404 Not Found`:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Campaign with ID 6acc... not found",
      "statusCode": 404
    }
  }
  ```
- **`503 Service Unavailable`:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Database is not connected. Cannot generate campaign.",
      "statusCode": 503,
      "databaseStatus": "disconnected"
    }
  }
  ```

---

## Future API Scope (Phase 10+)
- Direct WhatsApp Cloud API broadcast transmission (with customer opt-in and consent compliance)
- Message delivery analytics and clearance attribution tracking

