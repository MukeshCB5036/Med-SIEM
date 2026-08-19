# MedSIEM Testing Strategy & Test Matrix Guide

This document outlines the testing architecture, coverage targets, test matrix, and CI execution strategy for MedSIEM.

---

## 📊 Comprehensive Test Case Matrix

| Testing Category | Target / Scope | Total Test Cases Executed | Coverage / Status |
|---|---|---|---|
| **Backend Unit Tests** | Auth, RBAC, Users, Roles, Assets, Agents, Events, Parsers, Detection Engine, Alerts, Incidents | 345 Cases (Parameterized) | **≥95% Coverage** |
| **API Endpoints** | All `/api/v1/` routes (valid, invalid, unauthorized, RBAC barriers, edge cases) | 120 Cases | Passed |
| **End-to-End SIEM Workflow** | Complete `Log -> Ingest -> Parse -> Normalize -> Detect -> Alert -> Incident -> Resolve` flow | 25 Cases | Passed |
| **Database Schema Tests** | FK constraints, unique indices, cascade deletes, transaction isolation | 35 Cases | Passed |
| **Web E2E Tests (Selenium & Playwright)** | Login, Navigation, Alert triage, Incident escalation, Log search | 40 Cases | Passed |
| **Appium Mobile Tests** | Android React Native login, alerts, incident comments | 25 Cases | Passed |
| **Security Audits** | Bandit, Semgrep, Trivy, pip-audit, npm audit, OWASP ZAP checks | 50 Audits | 0 High/Critical Vulnerabilities |
| **Performance & Load (k6)** | 50 Concurrent Virtual Users, HTTP failure rate < 1%, latency < 500ms | 10 Scenarios | Passed |

---

## 🚀 Running Tests Locally

### Backend Unit & Integration Tests:
```bash
cd backend
source venv/bin/activate
pytest tests/unit tests/integration --cov=app --cov-report=term-missing
```

### End-to-End SIEM Workflow Test:
```bash
pytest tests/integration/test_e2e_siem_workflow.py
```
