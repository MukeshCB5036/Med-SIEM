# MEDSIEM — REMAINING WORK & TASK SPECIFICATION

This document outlines all pending work items required to bring MedSIEM to 100% academic and production readiness, strictly prioritized from critical blockers (P0) to presentation polish (P3).

---

## Priority P0 — Critical Blockers

### [TASK-P0-01] Alembic Baseline Migration Creation
- **Description:** Currently, `backend/alembic/versions/` only contains a single incremental migration (`ed9d8f956b2b`) that adds an index. A fresh database provisioning using `alembic upgrade head` fails because the base tables (`organizations`, `users`, `roles`, `assets`, `events`, etc.) are not created by Alembic. An initial baseline revision must be generated to ensure reproducible deployments.
- **Exact Files Involved:**
  - `backend/alembic/versions/` (new initial migration file)
  - `backend/alembic/versions/ed9d8f956b2b_add_missing_user_verification_and_agent_.py`
- **Dependencies:** PostgreSQL running or offline SQL generator via SQLAlchemy models.
- **Expected Outcome:** Running `alembic upgrade head` on an empty PostgreSQL database successfully creates all 13 tables and indexes.
- **Verification Method:** Test against a clean test database: `alembic upgrade head` completes with returncode 0.
- **Estimated Complexity:** Medium

### [TASK-P0-02] Segregation or Removal of Extraneous Repository Directory (`IP/`)
- **Description:** On October 22, 2026, an untracked directory `IP/` was added to the workspace containing an entirely unrelated project (*Athena Central College Library Management System*). This directory pollutes the git status and could compromise academic submission review.
- **Exact Files Involved:**
  - `IP/` (untracked directory)
- **Dependencies:** None.
- **Expected Outcome:** `IP/` is safely relocated outside the MedSIEM repository or removed so `git status` reflects only MedSIEM artifacts.
- **Verification Method:** `git status` shows no untracked `IP/` directory.
- **Estimated Complexity:** Low

---

## Priority P1 — Required for Core Feature Completeness

### [TASK-P1-01] Implement Read API for Audit Logging (`GET /api/v1/audit-logs`)
- **Description:** The backend actively records authentication security events into the `audit_logs` table (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `CHANGE_PASSWORD`, `EMAIL_VERIFIED`), but no API endpoint exists to read or export these logs. A protected read endpoint must be exposed for SOC analysts.
- **Exact Files Involved:**
  - `backend/app/modules/auth/router.py`
  - `backend/app/modules/auth/services.py`
  - `backend/app/modules/auth/repositories.py`
  - `backend/app/modules/auth/schemas.py`
- **Dependencies:** `AuditLog` SQLAlchemy model.
- **Expected Outcome:** `GET /api/v1/audit-logs` returns paginated audit records guarded by `PermissionChecker("users.read")` or `require_superuser`.
- **Verification Method:** Make authenticated GET request to `/api/v1/audit-logs`; verify list of recent login events returned.
- **Estimated Complexity:** Low

### [TASK-P1-02] Real Compliance Report Generation Engine
- **Description:** Currently, `frontend/src/app/reports/page.tsx` simulates CSV export with a dummy browser blob. Implement a real backend endpoint (`GET /api/v1/reports/compliance/csv`) that queries actual alerts, incident counts, and asset compliance stats from PostgreSQL and streams a legitimate CSV/JSON report (and optionally archives it to MinIO bucket `medsiem-reports`).
- **Exact Files Involved:**
  - `backend/app/modules/detection/router.py` (or new `reports` router)
  - `backend/app/modules/detection/services.py`
  - `frontend/src/app/reports/page.tsx`
- **Dependencies:** FastAPI response streaming, MinIO client.
- **Expected Outcome:** Clicking "Export Report (CSV)" downloads real computed SOC metrics and compliance audit summaries.
- **Verification Method:** Download exported CSV and verify columns contain actual database alert counts and asset data.
- **Estimated Complexity:** Medium

### [TASK-P1-03] Threat Intelligence Telemetry Clarification / Backend Endpoint
- **Description:** The Threat Intelligence screen (`/threat-intelligence`) is currently a static client-side UI mockup with 3 hardcoded IOCs. Either:
  1. Add a backend endpoint (`GET /api/v1/threat-intel/iocs`) storing threat indicators in the database and checking incoming event IP addresses against known IOCs.
  2. Or clearly label the screen in the UI as "Threat Intelligence Feed (Simulated Demonstration Model)" to avoid academic misrepresentation.
- **Exact Files Involved:**
  - `frontend/src/app/threat-intelligence/page.tsx`
  - (Optional) `backend/app/modules/events/router.py` or new model
- **Dependencies:** None.
- **Expected Outcome:** Transparent and functional threat intelligence view aligned with backend capabilities.
- **Verification Method:** Review Threat Intelligence page in browser and network tab.
- **Estimated Complexity:** Low to Medium

---

## Priority P2 — Testing and QA Validation

### [TASK-P2-01] Populate Executable Android Automation Spec Files in `automation/tests/`
- **Description:** The `automation/` directory has 14 Page Object classes and a WebdriverIO config, but `automation/tests/` is completely empty. The reported 510 Android test cases are purely synthetic data rows. Create at least 15-20 real, executable E2E Appium test specs validating login, alert triage, and asset inspection.
- **Exact Files Involved:**
  - `automation/tests/auth.e2e.js` (new)
  - `automation/tests/alerts.e2e.js` (new)
  - `automation/tests/incidents.e2e.js` (new)
  - `automation/tests/assets.e2e.js` (new)
- **Dependencies:** Appium server, Android emulator, `automation/pages/*`.
- **Expected Outcome:** Running `npm test` inside `automation/` executes real tests against the running Android emulator.
- **Verification Method:** `cd automation && npm test` runs cleanly and reports passed test cases.
- **Estimated Complexity:** High

### [TASK-P2-02] Expand Backend Pytest Test Suite
- **Description:** The backend currently has only 10 unit/integration tests across 6 files. Expand test coverage to at least 30-40 automated test functions covering:
  - Account lockout after 5 failed attempts
  - Token refresh failure upon tampering
  - Password change validation
  - Ingestion parser error handling (malformed JSON / unparsed syslog)
  - Alert resolution state transitions
  - OpenSearch search fallback handling
- **Exact Files Involved:**
  - `backend/tests/unit/test_auth.py`
  - `backend/tests/unit/test_auth_rbac.py`
  - `backend/tests/unit/test_events_ingestion.py`
  - `backend/tests/unit/test_detection_alerts_incidents.py`
- **Dependencies:** pytest, httpx.
- **Expected Outcome:** Pytest executes 35+ genuine tests with 100% pass rate.
- **Verification Method:** `docker exec medsiem-backend pytest` or local pytest run.
- **Estimated Complexity:** Medium

### [TASK-P2-03] Reconcile Synthetic QA Reports with Real Execution Metrics
- **Description:** The files `test-cases.xlsx`, `endpoint-inventory.xlsx`, `findings.xlsx`, and `Test Results/HTML/execution-report.html` report 960 executed tests with 100% pass rate, which are generated from `build_reports.py`. Reconcile documentation to explicitly distinguish between "Executed Automated Test Suites" (10 backend tests, X mobile tests) and "Comprehensive Requirement Verification Matrix" (960 verified test criteria).
- **Exact Files Involved:**
  - `build_reports.py`
  - `executive-summary.md`
  - `Test Results/Summary/`
- **Dependencies:** None.
- **Expected Outcome:** Transparent and defensible academic reporting.
- **Verification Method:** Inspection of summary markdown documents and HTML reports.
- **Estimated Complexity:** Low

---

## Priority P3 — Documentation and Presentation Improvements

### [TASK-P3-01] Consolidate Duplicated GitHub Actions CI Workflows
- **Description:** `.github/workflows/ci.yml` and `.github/workflows/ci-backend.yml` perform virtually identical tasks (both set up PostgreSQL and Redis service containers, install dependencies, and run backend tests). Consolidate into a single canonical `ci.yml` workflow to eliminate pipeline duplication.
- **Exact Files Involved:**
  - `.github/workflows/ci.yml`
  - `.github/workflows/ci-backend.yml`
- **Dependencies:** None.
- **Expected Outcome:** Single streamlined CI pipeline triggered on pull requests and pushes to `main`.
- **Verification Method:** Inspect workflow definitions and validate YAML syntax.
- **Estimated Complexity:** Low

### [TASK-P3-02] Academic Presentation Package & Screencast Walkthrough
- **Description:** Assemble final submission deliverables:
  - Screenshot gallery using existing assets in `android/app_screencap*.png` and web UI.
  - Architecture diagram visual exports (`medsiem-system-architecture.mmd` rendered to SVG/PNG).
  - ERD diagram visual export (`medsiem-database-erd.mmd` rendered to SVG/PNG).
  - Finalized Academic User & Demonstration Manual.
- **Exact Files Involved:**
  - `architecture/`
  - `database/`
  - `docs/demo-guide.md`
  - `README.md`
- **Dependencies:** Mermaid CLI or online renderer.
- **Expected Outcome:** Turnkey presentation-ready academic binder.
- **Verification Method:** Visual inspection of generated graphics and documentation.
- **Estimated Complexity:** Low
