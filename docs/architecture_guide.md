# MedSIEM Architecture Guide

MedSIEM is engineered as a **Modular Monolith** applying **Clean Architecture**, **SOLID Principles**, **Repository Pattern**, **Dependency Injection**, and **Service Layer Pattern**.

---

## 🏛 Core Architectural Components

### 1. Backend Core (`backend/app/`)
The backend is structured into autonomous modules under `backend/app/modules/`. Each module encapsulates:
- `models.py`: Database entities declared via SQLAlchemy 2.0 ORM.
- `schemas.py`: Input/output contract validation DTOs powered by Pydantic v2.
- `repositories.py`: Database query abstraction isolating SQL operations from business rules.
- `services.py`: Domain logic, evaluation workflows, and security assertions.
- `router.py`: FastAPI endpoint controllers bound to `/api/v1/`.

### 2. Frontend SOC Dashboard (`frontend/`)
Built with Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS.
- Real-time command center widgets for threat alerts and EPS monitoring.
- Enterprise security dark theme with WCAG AA compliance.

### 3. Cross-Platform Endpoint Agent (`agent/`)
Self-contained Python 3.13 daemon designed to run on Windows, Linux, and macOS endpoints for log and system metric extraction.

---

## 🔒 Security Architecture

- **JWT Token Pair Strategy**: Access tokens expire in 30 minutes; Refresh tokens are securely rotated every 7 days.
- **Data Protection & OWASP Headers**: All endpoints automatically inject Strict-Transport-Security, Content-Security-Policy, and Anti-Clickjacking headers via custom middleware.
