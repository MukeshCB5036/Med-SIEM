# MedSIEM Relational Database Schema & Persistence Architecture

## Overview
The MedSIEM backend utilizes **PostgreSQL 16** as its core relational data store, managed via **SQLAlchemy 2.0 ORM** and versioned with **Alembic** database migrations.

## Data Persistence & Hybrid Search Model
MedSIEM employs a hybrid persistence model:
1. **PostgreSQL 16**: System of record for core entities, identity management, RBAC, asset tracking, security rules, alerts, incidents, and audit trails.
2. **OpenSearch 2.13.0**: Parallel indexing engine for high-volume normalized security log streams. As logs are ingested and normalized, event records are written to PostgreSQL and simultaneously indexed into OpenSearch for full-text analytical queries.
3. **MinIO**: Cold storage object store for raw unparsed log archives.

## Core Database Tables & Relationships

### 1. Identity & RBAC Management
- **`organizations`**: Multi-tenant organizational entities with HIPAA Business Associate Agreement (`hipaa_bba_signed`) tracking.
- **`users`**: User accounts linked to an organization (`org_id`). Supports bcrypt password hashing, single-use email verification tokens, MFA 6-digit OTP hash (`otp_hash`), expiration timestamps, and lockout state (`is_locked`, `failed_login_attempts`).
- **`roles`**: Security roles (e.g. `Super Admin`, `SOC Manager`, `SOC Analyst`, `Viewer`).
- **`permissions`**: Granular permissions (e.g. `alerts.read`, `alerts.update`, `incidents.manage`, `users.create`).
- **`user_roles`**: Many-to-many junction table mapping `users` to `roles`.
- **`role_permissions`**: Many-to-many junction table mapping `roles` to `permissions`.

### 2. Asset & Host Agent Tracking
- **`assets`**: Healthcare IT infrastructure assets (EHR Servers, PACS Archives, Workstations, Domain Controllers) linked to `organizations`.
- **`agents`**: Host security endpoint daemons linked to `assets`. Tracks host OS, agent version, last heartbeat (`last_seen_at`), and status.

### 3. Log Ingestion & Event Stream
- **`raw_logs`**: Immutable audit records of raw incoming syslog/agent messages.
- **`normalized_events`**: Parsed events linked to `raw_logs` and `assets`, storing normalized fields (event type, severity, timestamp, hostname).

### 4. SIEM Detection, Alerts & Incidents
- **`detection_rules`**: Detection rule definitions mapped to MITRE ATT&CK techniques, event categories, and severity levels.
- **`alerts`**: Security alert instances triggered by `detection_rules` matching `normalized_events`. Linked to assigned SOC analyst (`assigned_user_id`).
- **`incidents`**: Formal security incident investigations created by escalating alerts.
- **`incident_alerts`**: Many-to-many junction table linking escalated `alerts` to `incidents`.
- **`incident_comments`**: Analyst investigation notes and comments attached to an `incident`.

## Security & Sensitive Field Protections
- **No Plaintext Passwords or OTPs**: Passwords stored exclusively as bcrypt hashes (`password_hash`). MFA OTP codes stored exclusively as SHA-256 digests (`otp_hash`).
- **Secret Isolation**: JWT secrets, SMTP credentials, and database credentials are excluded from the database schema and managed strictly via environment variables (`.env`).
