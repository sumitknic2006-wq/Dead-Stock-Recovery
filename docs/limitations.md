# Limitations and Scope Boundaries — StockSaathi AI

## Phase 1 Explicit Scope Boundaries

This document defines the strict boundaries enforced during Phase 1 (Project Structure, Workspace Inspection, and Starter Setup).

### Features Not Included in Phase 1
The following systems are deliberately deferred to Phase 2 and later phases:
1. **Database Integration:**
   - MongoDB / Mongoose connection is not initialized.
   - Schemas and database migrations are deferred.
2. **Business Logic & Inventory Processing:**
   - No mock or fake inventory data endpoints.
   - No CSV parsing or ingestion logic.
   - No dead-stock risk classification or formula calculations.
3. **Discount Engine & Recovery Planning:**
   - Dynamic markdown recommendations are deferred.
   - 7-day action campaign planner is deferred.
4. **Outreach & Communication:**
   - WhatsApp message template generator is deferred.
5. **Authentication & User Roles:**
   - JWT authentication and user sessions are deferred.
6. **Full Dashboard UI Implementation:**
   - The authoritative UI/UX reference (StockSaathi AI screenshot) is preserved as the source of truth for Phase 2+.
   - No partial or premature redesigns are implemented.
7. **Browser Extension:**
   - The `browser-extension/` directory is strictly an architectural placeholder.
