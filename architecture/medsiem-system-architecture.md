# MedSIEM System Architecture Specification

## Overview
MedSIEM is a healthcare-grade Security Operations Center (SOC) dashboard and Security Information and Event Management (SIEM) platform designed for HIPAA-compliant clinical environments.

## Architectural Layers

### 1. Client Layer
- **MedSIEM Web Application**: Built with Next.js 14 and Tailwind CSS, providing full SOC dashboard controls for security analysts.
- **MedSIEM Android Mobile App**: Developed in React Native for on-the-go SOC monitoring and incident triage.
- **MedSIEM Endpoint Security Agent**: Lightweight Python daemon deployed on healthcare host endpoints for system log collection and status heartbeats.

### 2. Application Layer (FastAPI Backend)
- **Security & Middleware**: `SecurityHeadersAndTracingMiddleware` enforces Security Headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) and request tracing.
- **Authentication & MFA**: Dual JWT architecture (`access_token` and `refresh_token`), SHA-256 OTP hash verification (`otp_hash`), rate-limiting, and account lockout protection.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions enforced via `PermissionChecker` and `require_superuser` dependencies.
- **Event Ingestion & Normalization**: Real-time parsing of incoming raw syslog/agent streams into standardized security events.
- **Detection & Incident Engine**: Rule evaluation engine matching events against MITRE ATT&CK mapped detection rules to generate Alerts and escalate Incidents.

### 3. Data & Storage Infrastructure
- **PostgreSQL 16**: Relational storage for organizations, users, roles, assets, agents, rules, alerts, incidents, and audit trails.
- **OpenSearch 2.13.0**: High-speed log indexer enabling full-text search across normalized security event streams.
- **Redis 7**: Memory cache for rate-limiting counters and session states.
- **MinIO**: Object storage backing raw log archives and investigation attachments.

### 4. Container Orchestration (Docker Compose)
The stack operates via Docker Compose across 6 dedicated containers:
1. `medsiem-frontend` (Port 3000)
2. `medsiem-backend` (Port 8000)
3. `medsiem-postgres` (Port 5432)
4. `medsiem-redis` (Port 6379)
5. `medsiem-opensearch` (Port 9200)
6. `medsiem-minio` (Port 9000/9001)

## Data Flow Diagram
```
Client Request -> FastAPI Gateway -> Auth & RBAC -> Module Handler -> PostgreSQL / OpenSearch
```
