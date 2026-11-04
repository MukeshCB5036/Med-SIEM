# MEDSIEM — CURRENT SYSTEM & PROJECT CONDITION REPORT

**Audit Date:** November 2, 2026  
**Auditor Roles:** Senior Software Architect, Cybersecurity Engineer, QA Lead, DevSecOps Lead, Technical Project Auditor  
**Repository Working Directory:** `/Users/hk/Documents/PDD`  
**Current Git Branch:** `main` (Commit `04bb0bc` — *Initial commit*)  
**Remote Origin:** `https://github.com/MukeshCB5036/Med-SIEM.git`  

---

## 1. Executive Summary

MedSIEM is a healthcare-focused Security Operations Center (SOC) and Security Information and Event Management (SIEM) platform designed for clinical and hospital IT environments (supporting HIPAA-aligned controls).

The codebase is mature, well-structured, and has working foundational implementations across the backend (FastAPI), web frontend (Next.js 14 App Router), mobile client (React Native Android), and endpoint log collector (Python agent). 

However, returning to the codebase reveals several critical disparities between documented project summaries and actual implementation realities:
1. **Core SIEM Pipeline is Functional:** Event ingestion, parsing (JSON, Syslog, Sysmon), canonical normalization, OpenSearch indexing, rule evaluation, alert generation, and incident escalation are fully implemented and integrated in code.
2. **Dual-Client SOC Operations:** Both the Next.js Web Dashboard and React Native Android application consume the backend REST API (`/api/v1`) with synchronized state.
3. **Synthetic QA Metrics in Reports:** The previously reported 960 automated test cases (510 Android + 450 backend) originate from a synthetic test case generator (`build_reports.py` and `Test Results/JSON/execution-results.json`). The actual executable backend test suite contains **10 unit/integration pytest tests**, and the Android automation directory (`automation/tests/`) contains **0 test spec files** despite having 14 Page Object classes.
4. **Mocked Features in UI:** Threat Intelligence (`/threat-intelligence`) and Compliance Reporting (`/reports`) are client-side UI mocks without corresponding backend models or functional data pipelines. Audit logs are written to the database during authentication actions, but have no query endpoint or UI view.
5. **Database Migration Gap:** Alembic contains only a single incremental migration (`ed9d8f956b2b`) adding an index. There is no baseline migration to construct tables from scratch on a clean PostgreSQL instance.
6. **Extraneous Project in Repository:** An untracked directory `IP/` contains a completely unrelated project (*Athena Central College Library Management System*) added on Oct 22, 2026.

---

## 2. Architecture & Subsystem Discovery

### 2.1 Backend Architecture (`backend/`)
- **Framework:** FastAPI running on Python 3.12 (`uvicorn app.main:app`).
- **Structure:** Modular domain-driven design under `backend/app/modules/`:
  - `auth`: Organization, User, Role, Permission, AuditLog, session handling, MFA, email verification.
  - `assets`: Healthcare IT assets, asset grouping, endpoint agents, heartbeat monitoring.
  - `events`: Log ingestion (single/batch), log parsing (JSON, Syslog, Sysmon), canonical event normalization, OpenSearch integration.
  - `detection`: Detection rules (MITRE ATT&CK mapped), real-time rule engine, alert triage, incident escalation, investigation comments.
- **Middleware:** `SecurityHeadersAndTracingMiddleware` injecting request UUID tracing, execution duration, and OWASP security headers (`nosniff`, `DENY`, `1; mode=block`, `HSTS`, `CSP`, `Referrer-Policy`).
- **Health Endpoint:** `GET /health` inspecting connectivity to Redis, OpenSearch, and MinIO.

### 2.2 Frontend Web Architecture (`frontend/`)
- **Framework:** Next.js 14 with React 18, TypeScript, and Tailwind CSS (Dark SOC Theme).
- **Routing:** Next.js App Router (`frontend/src/app/`):
  - `page.tsx`: SOC Overview Dashboard with metrics, alert stream, and auto-refresh.
  - `(auth)/login/page.tsx`: Dual-step login (credentials + Email MFA OTP).
  - `verify-email/page.tsx`: Token-based email verification screen.
  - `alerts/page.tsx`: Alert triage, severity/status filters, resolution workflow.
  - `incidents/page.tsx`: Incident investigation, status escalation, resolution.
  - `events/page.tsx`: Event explorer with OpenSearch full-text query bar and raw log modal.
  - `assets/page.tsx`: Asset inventory and endpoint agent management tabs.
  - `rules/page.tsx`: Detection rule toggle and inspection table.
  - `users/page.tsx`: Super Admin user creation modal and RBAC assignment.
  - `threat-intelligence/page.tsx`: Mock IOC reputation view.
  - `reports/page.tsx`: Mock CSV report generator.
  - `settings/page.tsx`: Static platform settings UI.
- **State & Auth:** `AuthContext.tsx` handling token storage, profile loading, and permission checks.

### 2.3 Android Mobile Architecture (`android/`)
- **Framework:** React Native 0.74 (Targeting Android SDK 34).
- **Structure:** Single primary component container `android/App.tsx` (36 KB) implementing 7 view states:
  - `LOGIN`: SOC analyst login screen.
  - `DASHBOARD`: Metric overview cards and high-priority alert cards.
  - `ALERTS`: Scrollable alert stream with status indicators.
  - `INCIDENTS`: Escalated security incident cases.
  - `EVENTS`: Normalized telemetry event list.
  - `ASSETS`: Monitored hospital host devices.
  - `PROFILE`: User information and logout trigger.
- **Networking:** `android/src/services/api.ts` connecting via `http://10.0.2.2:8000/api/v1` with a 15-second abort controller and formatted network error handling.

### 2.4 Endpoint Security Agent (`agent/`)
- **Technology:** Python 3.12 standalone daemon (`agent/main.py`).
- **Capabilities:**
  - Automated enrollment via `POST /api/v1/agents/register`.
  - Secure credential reception (`agent_id` and hashed `api_key`).
  - Background heartbeat loop via `POST /api/v1/agents/heartbeat` (10s interval).
  - Batch log collection and transmission via `POST /api/v1/events/ingest/batch`.

### 2.5 Storage & Infrastructure Layer
- **PostgreSQL 16:** Relational storage for 13 domain tables across users, RBAC, assets, rules, alerts, incidents, and audit logs. Volume: `pgdata`.
- **OpenSearch 2.13.0:** Full-text indexing in index `medsiem-events`. Single-node cluster with security plugin disabled for internal container communication. Volume: `opensearch-data`.
- **Redis 7:** Standalone in-memory store configured on port 6379. Pinged in `/health`; rate limiting / caching hooks defined.
- **MinIO S3:** High-performance object storage on port 9000/9001 with bucket `medsiem-reports`. Volume: `minio-data`.

### 2.6 Docker Compose Stack (`docker/docker-compose.yml`)
Six containers orchestrated with dedicated health checks and container networking:
1. `medsiem-backend` (FastAPI, Port 8000)
2. `medsiem-frontend` (Next.js, Port 3000)
3. `medsiem-postgres` (PostgreSQL 16, Port 5432)
4. `medsiem-redis` (Redis 7, Port 6379)
5. `medsiem-opensearch` (OpenSearch 2.13.0, Port 9200)
6. `medsiem-minio` (MinIO, Ports 9000/9001)

---

## 3. Account Identities & Security Model Baseline

| Account Email | Role | Superuser | MFA Status | Email Verified | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mukeshcb240@gmail.com` | Super Admin | `True` | **ENABLED** (Mandatory OTP) | `True` | Primary Administrative Identity |
| `admin@medsiem.org` | SOC Analyst | `False` | **DISABLED** (Direct Login) | `True` | Demo SOC Operator & Automated E2E Testing |
