# MedSIEM Backend Component & Architecture Inventory

## Overview
MedSIEM is a high-performance Healthcare SOC (Security Operations Center) & SIEM (Security Information and Event Management) platform built with FastAPI, PostgreSQL, OpenSearch, Redis, and MinIO.

## Microservice Architecture & Core Components

| Component | Technology | Role / Responsibilities | Port | Container Name |
| :--- | :--- | :--- | :--- | :--- |
| **REST API Backend** | FastAPI (Python 3.12) | API endpoints, JWT Auth, RBAC, MFA OTP, Event Ingestion Engine, Detection Rules Engine | 8000 | `medsiem-backend` |
| **Database** | PostgreSQL 16 Alpine | Relational storage for users, roles, assets, agents, rules, alerts, incidents, and comments | 5432 | `medsiem-postgres` |
| **Search Engine** | OpenSearch 2.13.0 | Real-time full-text indexing, log search, and analytical queries across normalized security events | 9200 | `medsiem-opensearch` |
| **Cache & Task Queue** | Redis 7 Alpine | Rate limiting, session caching, and background job message broker | 6379 | `medsiem-redis` |
| **Object Storage** | MinIO | HIPAA-compliant raw log archive storage and attachment repository | 9000/9001 | `medsiem-minio` |
| **Web SOC Dashboard** | Next.js 14 / React | Web management interface for security analysts | 3000 | `medsiem-frontend` |
| **Mobile App** | React Native (Android) | On-the-go SOC analyst mobile interface | - | `emulator-5554` |
| **Endpoint Agent** | Python 3.12 | Cross-platform host security agent for log collection and heartbeat monitoring | - | - |

## Data Flow Pipeline

```
Endpoint Agent / Syslog -> POST /api/v1/events/ingest -> Event Parsing & Normalization
                                                               |
                                                               v
PostgreSQL (Normalized Event) <-------------------- Indexing into OpenSearch (q Search)
         |
         v
Detection Engine Evaluation (Rules Match) -> Alert Generated -> Incident Escalation
```

## Security Controls Inventory
- **Authentication**: JWT access token (15-min expiry) + refresh token (7-day expiry).
- **MFA**: Mandatory 6-digit email OTP for Super Admin and SOC Manager roles.
- **RBAC**: Fine-grained permissions (`users.read`, `users.create`, `alerts.read`, `alerts.update`, `incidents.manage`, `settings.manage`).
- **Data Protection**: Single-use tokens, bcrypt hashing, rate limiting, and Security Headers middleware.
