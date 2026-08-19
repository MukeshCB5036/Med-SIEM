# MedSIEM Dependency Security & Vulnerability Report

## Executive Summary
This report evaluates third-party software dependencies across the FastAPI backend, Next.js frontend, and React Native Android app using automated security scanners (Semgrep, Trivy, Gitleaks).

## Scanned Ecosystems

### 1. Python Backend (`backend/requirements.txt`)
- **FastAPI / Uvicorn**: Current version, no known CVEs.
- **SQLAlchemy / Alembic**: PostgreSQL ORM and migration tool stack verified secure.
- **Passlib / Bcrypt / PyJWT**: Cryptographic libraries updated. Passlib `crypt` deprecation warning noted for Python 3.13 upgrade path.

### 2. Frontend Web SOC (`frontend/package.json`)
- **Next.js 14.2.35**: Latest patch release for Next.js 14 series. High-severity CVE-2024-34351 and related SSRF vulnerabilities patched.
- **TailwindCSS**: CSS framework verified clean.

### 3. Android Mobile App (`android/package.json`)
- **React Native 0.74.1**: Current stable release. Gradle wrappers and dependencies audited.

## Secret Exposure Audit
- **Gitleaks Scan**: 0 plain-text credentials or API secrets found in version control.
- **Environment Isolation**: Production credentials isolated in `.env` (untracked). `.env.example` contains safe placeholders.
