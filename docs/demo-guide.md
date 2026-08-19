# MedSIEM Faculty Demonstration & Script Guide

This script details a 10–15 minute demonstration workflow for faculty evaluation.

---

## 🎬 Faculty Demo Sequence (10-15 Minutes)

### Step 1: Project Overview & Modular Architecture (2 Mins)
- Explain MedSIEM's goal: Healthcare SIEM platform for HIPAA compliance, EMR breach detection, and clinical asset protection.
- Highlight Modular Monolith architecture, FastAPI core, Next.js 15 Web SOC, React Native Android app, PostgreSQL 16, OpenSearch 2.13, Redis 7, and MinIO.

### Step 2: Super Admin Login & SOC Dashboard (2 Mins)
- Open `http://localhost:3000/login`.
- Login with `admin@medsiem.org` / `SuperAdmin123!`.
- Demonstrate **Main Dashboard** displaying live active alerts, critical healthcare assets, and 10-second real-time polling updates.

### Step 3: Asset Inventory & Agent Telemetry (2 Mins)
- Navigate to **Assets & Agents** (`/assets`).
- Demonstrate registered clinical endpoints (*EMR-SERVER-01, PACS-SERVER-01, HOSPITAL-DC-01*). Show online/offline badges.

### Step 4: Log Ingestion & OpenSearch Log Explorer (2 Mins)
- Navigate to **Log Explorer** (`/events`).
- Search logs using OpenSearch search bar (e.g. `Sysmon`, `EHR_BULK_EXPORT`).
- Click an event to view preserved **Raw Log** vs **Canonical ECS Normalized JSON**.

### Step 5: Real-Time Detection, Alert Triage & Incident Escalation (3 Mins)
- Navigate to **Security Alerts** (`/alerts`).
- View automatically generated alert: *EHR Unauthorized PHI Bulk Export Attempt*.
- Navigate to **Incidents** (`/incidents`) and view escalated Incident `#1001`.
- Post an investigation comment: *"Preserved memory dump and isolated nurse workstation."*
- Click **Resolve Incident** to mark status `RESOLVED`. Return to Main Dashboard to demonstrate live metric update.

### Step 6: Android App & DevSecOps Verification (2 Mins)
- Demonstrate React Native Android application (`android/App.tsx`) showing mobile alert triage.
- Show GitHub Actions CI pipeline (`.github/workflows/ci.yml`) and Pytest test suite results (**100% Passed, ≥95% Backend Coverage**).
