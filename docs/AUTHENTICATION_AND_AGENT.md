# MedSIEM Security Architecture & Endpoint Agent Documentation

## 1. Authentication, Email Verification & MFA Architecture

```
User Registration (Admin)
        │
        ▼
User Created (email_verified=False)
        │
        ▼
Verification Token Generated (Hashed SHA-256 in DB)
        │
        ▼
Verification Email Sent (SMTP abstraction)
        │
        ▼
User Clicks Link -> GET /verify-email?token=xyz
        │
        ▼
POST /api/v1/auth/verify-email (Token validated, user verified)
```

```
User Sign In (Email + Password)
        │
        ▼
Credentials Validated
        │
        ▼
MFA Policy Check (Super Admin / SOC Manager / mfa_enabled)
 ├── NO ──> Issue Access & Refresh JWT Tokens
 └── YES ──> Generate 6-Digit OTP (Hashed SHA-256)
               │
               ▼
             Send OTP Email & Issue Short-lived mfa_token
               │
               ▼
             User Submits OTP to POST /api/v1/auth/verify-otp
               │
               ▼
             OTP Validated -> Issue Final Access & Refresh JWT Tokens
```

## 2. SMTP & Email Service Configuration

Configured via environment variables in `.env`:
- `SMTP_HOST`: SMTP server hostname (default: `localhost`).
- `SMTP_PORT`: Port number (default: `1025`).
- `SMTP_USERNAME`: Optional SMTP auth username.
- `SMTP_PASSWORD`: Optional SMTP auth password.
- `SMTP_FROM_EMAIL`: Sender address (`noreply@medsiem.org`).
- `SMTP_FROM_NAME`: Sender display name (`MedSIEM Healthcare SOC`).
- `SMTP_USE_TLS`: Enable TLS security (`true`/`false`).

## 3. MedSIEM Endpoint Agent Architecture & Pipeline

```
Host Operating System (macOS / Linux / Windows)
        │
        ▼
MedSIEM Agent (agent/main.py)
 ├── Enrollment: POST /api/v1/agents/register (Asset linked, API Key generated)
 ├── Heartbeat: POST /api/v1/agents/heartbeat (Every 10s, updates status to Online)
 └── Telemetry: POST /api/v1/events/ingest/batch (Batch log collection)
        │
        ▼
FastAPI Ingestion Engine (/api/v1/events/ingest)
        │
        ▼
PostgreSQL Event Store & OpenSearch Index (`medsiem-events`)
        │
        ▼
Detection Engine (Evaluates rules e.g., EHR_BULK_EXPORT)
        │
        ▼
Alert & Incident Generation (Visible on Web SOC Dashboard & Android Mobile App)
```

## 4. Agent Credential Revocation
SOC Administrators can revoke compromised or decommissioned agents from the Web Dashboard (`/assets` -> Endpoint Agents tab -> *Revoke Credential*).
Upon revocation:
1. Agent status changes to `REVOKED`.
2. Heartbeat requests are rejected with `401 Unauthorized`.
3. Further log ingestion from the revoked API Key is blocked.
