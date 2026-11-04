# MEDSIEM — FINAL COMPLETION ROADMAP & DEFENSE PREPARATION

**Target Objective:** Complete all remaining project requirements, reconcile QA artifacts, and prepare an airtight academic project presentation and code submission.

---

## Phase 1: Repository Hygiene & Critical Blockers (Days 1–2)

### Step 1.1: Relocate Extraneous Directory (`IP/`)
- Move the untracked `IP/` folder (*Athena Central College Library Management System*) outside of the MedSIEM repository directory so `git status` reflects only MedSIEM files.
- Verify with `git status`.

### Step 1.2: Generate Clean Alembic Baseline Migration
- Create an initial baseline migration in `backend/alembic/versions/` that defines table creation for all 13 core models (`organizations`, `users`, `roles`, `permissions`, `assets`, `agents`, `raw_logs`, `normalized_events`, `detection_rules`, `alerts`, `incidents`, `incident_alerts`, `incident_comments`, `audit_logs`).
- Link migration `ed9d8f956b2b` to this initial revision as its `down_revision`.
- Verify with `alembic upgrade head` on a test SQLite/PostgreSQL database.

---

## Phase 2: Feature Completeness & Endpoint Polish (Days 3–4)

### Step 2.1: Implement Audit Log Query Endpoint (`GET /api/v1/audit-logs`)
- In `backend/app/modules/auth/router.py`, add `GET /audit-logs` endpoint with pagination (`skip`, `limit`), filtering by action, and permission guard (`users.read`).
- Expose timestamp, action name, IP address, user agent, and details.
- Add simple table view or modal in frontend to view audit trail.

### Step 2.2: Implement Functional Compliance Report Export
- In `backend/app/modules/detection/router.py` (or a dedicated reports module), create `GET /api/v1/reports/compliance/csv`.
- The endpoint queries live database records:
  - Total events ingested & parsed.
  - Active assets & agent heartbeat compliance status.
  - Alerts breakdown by severity and resolution time.
  - Incident response timeline metrics.
- Generate and stream legitimate CSV content to replace the simulated browser blob in `frontend/src/app/reports/page.tsx`.

### Step 2.3: Clarify Threat Intelligence Module
- Update `frontend/src/app/threat-intelligence/page.tsx` header to read:  
  *"Threat Intelligence & IOC Reputation Engine (Telemetry Correlation Feed)"*.
- Connect table to a backend endpoint or document that indicators represent pre-seeded hospital threat feeds for demonstration.

---

## Phase 3: QA & Automation Reconciliation (Days 5–7)

### Step 3.1: Author Real Mobile Automation Specs
- Leverage the 14 Page Object classes in `automation/pages/` to author 4 core WebdriverIO test files in `automation/tests/`:
  - `auth.e2e.js`: Validates login with `admin@medsiem.org` and invalid password rejection.
  - `dashboard.e2e.js`: Validates metric card rendering and navigation tabs.
  - `alerts.e2e.js`: Validates alert list loading and status badge verification.
  - `assets.e2e.js`: Validates asset inventory display.
- Run `npm test` in `automation/` to execute live against the Android emulator.

### Step 3.2: Expand Backend Pytest Suite
- Expand `backend/tests/` from 10 tests to 30+ tests, adding:
  - Account lockout verification after 5 failed password attempts.
  - Verification token expiration check.
  - OpenSearch fallback behavior when search index is unreachable.
  - Syslog unparsed message fallback parsing.
  - Duplicate email creation rejection (HTTP 400).
  - Malformed JWT token rejection.

### Step 3.3: Reconcile QA Summary Documentation
- Update `executive-summary.md` and report headers to clearly state:
  - **Automated Test Suites:** 30+ Pytest tests + 4 Appium E2E specs.
  - **Functional Requirement Matrix:** 960 mapped and verified test scenarios across mobile, web, and detection rules.

---

## Phase 4: Final Submission Deliverables & Presentation (Days 8–9)

### Step 4.1: CI Workflow Streamlining
- Merge `.github/workflows/ci-backend.yml` into `.github/workflows/ci.yml`.
- Verify GitHub Actions syntax via linter.

### Step 4.2: Visual Asset Generation
- Render Mermaid architecture diagrams:
  - Export `architecture/medsiem-system-architecture.mmd` to PNG/SVG.
  - Export `database/medsiem-database-erd.mmd` to PNG/SVG.
- Package existing mobile screenshots (`android/app_screencap*.png`) into the final presentation folder.

### Step 4.3: Final Project Commit & Tag
- Review `git status` (ensuring 0 untracked non-project files).
- Stage all project files: `git add .`
- Create release commit: `git commit -m "chore(release): prepare MedSIEM v1.0.0 academic submission package"`
- Tag release: `git tag -a v1.0.0 -m "MedSIEM Healthcare SOC Platform v1.0.0"`
- Push to GitHub remote: `git push origin main --tags`
