# MedSIEM — Healthcare Security Information and Event Management Platform

[![Build Status](https://github.com/medsiem/medsiem/actions/workflows/ci.yml/badge.svg)](https://github.com/medsiem/medsiem/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.13+](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://www.python.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Android-green.svg)](https://reactnative.dev/)

MedSIEM is a production-ready, enterprise-grade Security Information and Event Management (SIEM) platform tailored specifically for healthcare environments (EHR monitoring, HIPAA compliance, PHI protection, and clinical endpoint detection).

---

## 🌟 Architectural Overview

```
                                +---------------------------+
                                |  MedSIEM Endpoint Agent   |
                                | (Win/Linux/macOS telemetry|
                                +-------------+-------------+
                                              | mTLS / HTTPS
                                              v
+-------------------------+     +---------------------------+     +--------------------------+
| Next.js SOC Dashboard   |---->|  MedSIEM FastAPI Gateway  |<----| Android Mobile App       |
| (Web UI / React 19)     |     |  (Modular Monolith Core)  |     | (React Native)           |
+-------------------------+     +-------------+-------------+     +--------------------------+
                                              |
               +------------------------------+------------------------------+
               |                              |                              |
               v                              v                              v
    +--------------------+        +-----------------------+        +-------------------+
    | PostgreSQL DB      |        | OpenSearch Cluster    |        | Redis + Celery    |
    | (Relational Meta)  |        | (High-Speed Log Index)|        | (Async Workers)   |
    +--------------------+        +-----------------------+        +-------------------+
```

---

## 🛠 Quick Start (Running Production Stack)

### 1. Launch Docker Compose Cluster
```bash
cp .env.example .env
docker-compose -f docker/docker-compose.yml up -d --build
```

### 2. Run Backend API Server & Seed Database
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -c "from app.core.database import Base, engine; from app.db.seed import seed_database; from sqlalchemy.orm import sessionmaker; Base.metadata.create_all(bind=engine); Session=sessionmaker(bind=engine); s=Session(); seed_database(s); s.close()"
uvicorn app.main:app --reload --port 8000
```

### 3. Run Next.js Web SOC Dashboard
```bash
cd frontend
npm install
npm run dev
```

### 4. Run React Native Android App
```bash
cd android
npm install
npx react-native run-android
```

---

## 🔑 Demo Super Admin Credentials & Access URLs

- **Web Dashboard URL**: `http://localhost:3000`
- **Swagger REST API Docs**: `http://localhost:8000/api/v1/docs`
- **Super Admin Email**: `admin@medsiem.org`
- **Password**: `SuperAdmin123!`

---

## 📚 Documentation Sitemap

Comprehensive documentation is available in the [`docs/`](./docs) directory:
- [High-Level System Architecture](./docs/architecture.md)
- [Developer Onboarding Guide](./docs/developer_guide.md)
- [Testing Strategy & Test Matrix](./docs/testing-guide.md)
- [Security Auditing & Baseline](./docs/security-testing.md)
- [Performance & k6 Load Testing](./docs/performance-testing.md)
- [Android Mobile App Guide](./docs/android-guide.md)
- [Log Ingestion & ECS Schema](./docs/log_ingestion_guide.md)
- [Detection Engine & Incident Guide](./docs/detection_incident_guide.md)
- [Asset & Agent Registration](./docs/asset_agent_guide.md)
- [Production Deployment Guide](./docs/deployment-guide.md)
- [User & Operator Manual](./docs/user-guide.md)
- [REST API Reference](./docs/api-guide.md)
- [Faculty Demonstration Script](./docs/demo-guide.md)
- [Final Submission Checklist](./docs/final-submission-checklist.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
