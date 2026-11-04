# MEDSIEM — REST API SPECIFICATION & CLIENT CONTRACTS
## Phase 1: Core Platform, Architecture & Application Foundation

**Version:** 1.0.0 (Phase 1 Baseline)  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Classification:** Enterprise Healthcare API Specification  
**Base URL:** `http://localhost:8000/api/v1`  
**Swagger UI:** `http://localhost:8000/api/v1/docs`  
**ReDoc UI:** `http://localhost:8000/api/v1/redoc`  
**Status:** IMPLEMENTED & TESTED  

---

## 1. Global API Standards & Envelope

All MedSIEM endpoints follow strict REST conventions, consume and produce `application/json; charset=utf-8`, and adhere to a unified response envelope model.

### 1.1 Response Envelope Structure

#### Success Envelope (`ApiResponse[T]`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "count": 10,
    "skip": 0,
    "limit": 50,
    "page": 1,
    "total_pages": 1
  }
}
```

#### Error Envelope
```json
{
  "success": false,
  "data": null,
  "error": "Human-readable error description",
  "meta": {
    "code": "ERROR_CODE_ENUM",
    "details": { ... }
  }
}
```

### 1.2 HTTP Status Codes
| Code | Meaning | Typical Usage |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard GET, PATCH, and state transition mutations |
| `201 Created` | Resource created | Successful POST entity creation (User, Asset, Rule, Ingest) |
| `400 Bad Request` | Validation failure | Malformed JSON, Pydantic validation error, business logic violation |
| `401 Unauthorized` | Missing / invalid credentials | Expired JWT, invalid bearer header, missing agent API key |
| `403 Forbidden` | Insufficient permissions | Role lacks required permission (e.g., Viewer modifying assets) |
| `404 Not Found` | Resource does not exist | Specified UUID not found in organization scope |
| `422 Unprocessable Entity` | Type coercion failure | FastAPI path parameter format violation |
| `423 Locked` | Account locked | User account locked due to 5 consecutive failed login attempts |
| `500 Server Error` | Unhandled internal error | System exception (captured with request tracing ID) |

### 1.3 Authentication Headers

#### Analyst & Web User Authentication
```http
Authorization: Bearer <jwt_access_token>
```

#### Endpoint Agent Authentication
```http
X-Agent-Key: <agent_api_key_secret>
```

---

## 2. System Health & Infrastructure Telemetry

### `GET /health` & `GET /api/v1/health`
Retrieves comprehensive status of core SIEM subsystems and backing infrastructure (Redis, OpenSearch, MinIO).

- **Authentication:** None (Public healthcheck probe)
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "platform": "MedSIEM - Healthcare Security Operations Center",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "redis": true,
    "opensearch": true,
    "minio": true
  }
}
```

---

## 3. Authentication & RBAC Module (`/api/v1/auth`)

### 3.1 `POST /api/v1/auth/login`
Authenticates user with email and password. Enforces 5-strike lockout control.

- **Request Body:**
```json
{
  "email": "analyst@medsiem.org",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK` (Direct Login):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "mfa_required": false,
    "user": {
      "id": "e4b2d35e-0ff0-4829-9e87-8d77aa5d79c0",
      "email": "analyst@medsiem.org",
      "full_name": "Senior SOC Analyst",
      "role": "SOC Analyst",
      "is_superuser": false,
      "failed_login_attempts": 0,
      "locked_until": null
    }
  }
}
```
- **Response `200 OK` (MFA Step Required):**
```json
{
  "success": true,
  "data": {
    "mfa_required": true,
    "mfa_token": "temp_mfa_session_token_xyz"
  }
}
```
- **Response `423 Locked` (Account Lockout Active):**
```json
{
  "success": false,
  "data": null,
  "error": "Account is temporarily locked due to 5 consecutive failed login attempts. Try again after 2026-11-02T16:25:00Z."
}
```

### 3.2 `POST /api/v1/auth/verify-otp`
Validates 6-digit email OTP for privileged user sessions.
- **Request Body:**
```json
{
  "mfa_token": "temp_mfa_session_token_xyz",
  "otp": "839201"
}
```

### 3.3 `POST /api/v1/auth/refresh`
Rotates and issues new access & refresh token pair.
- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1Ni..."
}
```

### 3.4 `GET /api/v1/auth/me`
Retrieves authenticated operator profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:** Returns current `UserResponse`.

### 3.5 `POST /api/v1/auth/change-password`
Changes authenticated user password with minimum length and complexity validation.
- **Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```

---

## 4. Audit Trail & Notifications

### 4.1 `GET /api/v1/audit-logs`
Queries HIPAA audit trails with pagination, time bounding, and action filtering.
- **Required Permission:** `users.read`
- **Query Parameters:**
  - `page` (int, default `1`)
  - `page_size` (int, default `50`)
  - `action` (string, e.g., `USER_LOGIN_SUCCESS`, `ACCOUNT_LOCKED`, `ALERT_UPDATED`)
  - `user_id` (UUID, optional)
  - `start_date` (ISO-8601 UTC timestamp, optional)
  - `end_date` (ISO-8601 UTC timestamp, optional)
  - `search` (string, optional)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "78b663ea-f2cb-464a-a0f1-bf63f237ef12",
        "user_id": "e4b2d35e-0ff0-4829-9e87-8d77aa5d79c0",
        "action": "USER_LOGIN_SUCCESS",
        "resource": "auth",
        "ip_address": "192.168.1.105",
        "user_agent": "Mozilla/5.0 ...",
        "details": { "auth_method": "password" },
        "created_at": "2026-11-02T16:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "page_size": 50,
    "total_pages": 1
  }
}
```

### 4.2 `GET /api/v1/notifications`
Lists system broadcast notices and high-priority alerts for authenticated operator.
- **Query Parameters:** `unread_only=true|false`
- **Response `200 OK`:** Array of `NotificationResponse` objects.

### 4.3 `PATCH /api/v1/notifications/{id}/read`
Marks a specific notification as read.
- **Response `200 OK`:** Updated `NotificationResponse`.

---

## 5. Asset Inventory & Clinical Context (`/api/v1/assets`)

### 5.1 `GET /api/v1/assets`
Lists registered healthcare assets with clinical criticality, department, and operational impact.
- **Required Permission:** `users.read`
- **Query Parameters:**
  - `skip` (int, default `0`)
  - `limit` (int, default `50`)
  - `search` (string, optional hostname/IP search)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "71b058a5-d86b-4786-9a2c-c5188f506a64",
      "name": "PACS-IMAGING-SRV-01",
      "ip_address": "10.0.14.22",
      "mac_address": "00:1A:2B:3C:4D:5E",
      "criticality": "CRITICAL",
      "department": "Radiology & Imaging",
      "clinical_service": "DICOM Image Archival & Triage",
      "operational_dependency": "EMR Bridge & PACS Server Gateway",
      "potential_operational_impact": "Immediate diagnostic imaging halt; surgery scheduling suspension",
      "status": "ACTIVE",
      "is_active": true,
      "created_at": "2026-11-02T12:00:00Z"
    }
  ],
  "meta": { "skip": 0, "limit": 50, "count": 1 }
}
```

### 5.2 `POST /api/v1/assets`
Registers a new healthcare asset with complete clinical metadata.
- **Required Permission:** `users.create`
- **Request Body:**
```json
{
  "name": "ICU-VENTILATOR-GW-04",
  "ip_address": "10.0.18.55",
  "mac_address": "00:2B:3C:4D:5E:6F",
  "criticality": "CRITICAL",
  "department": "Intensive Care Unit (ICU)",
  "clinical_service": "Bedside Ventilator Telemetry Feed",
  "operational_dependency": "Central Nursing Monitoring Station",
  "potential_operational_impact": "Loss of centralized respiratory alarms for 24 ICU beds",
  "os_id": null
}
```

---

## 6. Endpoint Agents & Enrollment Tokens (`/api/v1/agents`)

### 6.1 `POST /api/v1/agents/enrollment-tokens`
Generates a cryptographically secure, pre-shared token for unattended agent enrollment.
- **Required Permission:** `users.create`
- **Request Body:**
```json
{
  "description": "Emergency Department PACS Workstation Enrollment",
  "expires_days": 30,
  "max_uses": 100
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "token": "medsiem_et_8f04b2e9a11c47db9e64...",
    "description": "Emergency Department PACS Workstation Enrollment",
    "expires_at": "2026-12-02T16:00:00Z",
    "max_uses": 100,
    "uses_count": 0,
    "is_revoked": false
  }
}
```

### 6.2 `GET /api/v1/agents/enrollment-tokens`
Lists existing enrollment tokens, remaining uses, and active status.
- **Required Permission:** `users.read`

### 6.3 `POST /api/v1/agents/register`
Initializes a new endpoint agent using an enrollment token, issuing a persistent agent ID and API key.
- **Authentication:** Enrollment Token
- **Request Body:**
```json
{
  "enrollment_token": "medsiem_et_8f04b2e9a11c47db9e64...",
  "hostname": "RAD-STATION-01.med.local",
  "ip_address": "10.0.14.88",
  "os": "Windows 11 Pro 23H2",
  "version": "1.0.0"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "agent_id": "a91b415e-382a-4389-9b93-529a672776c5",
    "api_key": "medsiem_ak_7a8b9c0d1e2f3a4b5c6d...",
    "server_time": "2026-11-02T16:05:00Z",
    "heartbeat_interval_seconds": 60
  }
}
```

### 6.4 `POST /api/v1/agents/heartbeat`
Processes endpoint agent health metrics and updates telemetry freshness.
- **Authentication:** `X-Agent-Key` or `agent_id`
- **Request Body:**
```json
{
  "agent_id": "a91b415e-382a-4389-9b93-529a672776c5",
  "telemetry_freshness_seconds": 12,
  "collector_health": {
    "status": "healthy",
    "cpu_percent": 2.1,
    "memory_mb": 48.4,
    "disk_free_gb": 94.2,
    "events_queued": 0,
    "events_dropped": 0,
    "syslog_listener_active": true
  }
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "status": "acknowledged",
    "received_at": "2026-11-02T16:06:00Z",
    "commands": []
  }
}
```

---

## 7. Event Ingestion & Log Explorer (`/api/v1/events`)

### 7.1 `POST /api/v1/events/ingest`
Ingests a single raw syslog or agent telemetry log line, normalizes it, indexes it into OpenSearch, and runs detection rules.
- **Request Body:**
```json
{
  "source_name": "Sysmon-Endpoint-Agent",
  "raw_content": "<134>1 2026-11-02T16:00:00Z RAD-STATION-01 Microsoft-Windows-Sysmon 1 - - EventID=1 Image=C:\\Windows\\System32\\cmd.exe CommandLine=\"cmd.exe /c whoami\" User=NT AUTHORITY\\SYSTEM",
  "source_ip": "10.0.14.88",
  "received_at": "2026-11-02T16:00:01Z"
}
```
- **Response `201 Created`:** Returns `NormalizedEventResponse`.

### 7.2 `POST /api/v1/events/ingest/batch`
High-throughput batch ingestion endpoint for distributed agents.
- **Request Body:**
```json
{
  "agent_id": "a91b415e-382a-4389-9b93-529a672776c5",
  "batch_size": 2,
  "events": [
    {
      "source_name": "Sysmon",
      "raw_content": "EventID=1 Image=cmd.exe User=ADMIN",
      "source_ip": "10.0.14.88"
    },
    {
      "source_name": "AuthLog",
      "raw_content": "Failed password for root from 10.0.14.99 port 5432",
      "source_ip": "10.0.14.99"
    }
  ]
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": [ { ... }, { ... } ],
  "meta": { "count": 2 }
}
```

### 7.3 `GET /api/v1/events/search`
Executes real-time full-text search against the OpenSearch log index.
- **Required Permission:** `alerts.read`
- **Query Parameters:**
  - `q` (string, full-text query e.g. `EventID:1 AND User:SYSTEM`)
  - `limit` (int, default `50`)

---

## 8. Detection Rules, Alerts & Incidents

### 8.1 Detection Rules (`/api/v1/rules`)
- `GET /api/v1/rules`: List all active MITRE ATT&CK mapped rules.
- `POST /api/v1/rules`: Create custom detection rule (`settings.manage` required).
```json
{
  "name": "PACS DICOM Exfiltration Attempt",
  "description": "Detects high-volume outbound data transfers from PACS diagnostic imaging hosts",
  "severity": "CRITICAL",
  "mitre_technique_id": "T1048",
  "rule_type": "THRESHOLD",
  "conditions": {
    "field": "bytes_out",
    "operator": "gt",
    "value": 500000000,
    "time_window_seconds": 60
  },
  "is_enabled": true
}
```

### 8.2 Security Alerts (`/api/v1/alerts`)
- `GET /api/v1/alerts`: Query alerts with severity, status, and pagination filters.
- `GET /api/v1/alerts/{id}`: Retrieve alert with **Explainable Detection Details**.
- **Alert Response Model (`AlertResponse`):**
```json
{
  "id": "2d8f99e0-3bf1-4e92-a745-9831a491ef23",
  "title": "Unauthorized DICOM C-STORE Direct Extract",
  "description": "High-volume unauthorized DICOM store command detected from external IP",
  "severity": "CRITICAL",
  "status": "OPEN",
  "rule_id": "4a71b123-f222-4a00-993a-810a719284fa",
  "asset_id": "71b058a5-d86b-4786-9a2c-c5188f506a64",
  "matched_conditions": {
    "protocol": "DICOM",
    "command": "C-STORE-RQ",
    "source_ip_internal": false,
    "image_count_threshold": 100
  },
  "supporting_events": [
    "e18237ba-012a-4318-8f81-a719241bba01",
    "e18237ba-012a-4318-8f81-a719241bba02"
  ],
  "detection_timestamp": "2026-11-02T15:45:00Z",
  "severity_rationale": "Direct exfiltration of protected patient diagnostic scans compromises HIPAA Security & Privacy Rules and risks data manipulation.",
  "created_at": "2026-11-02T15:45:02Z"
}
```
- `POST /api/v1/alerts/{id}/assign`: Assign alert to analyst UUID (`alerts.update` required).
- `POST /api/v1/alerts/{id}/resolve`: Mark alert resolved with clinical resolution notes.

### 8.3 Security Incidents (`/api/v1/incidents`)
- `GET /api/v1/incidents`: Query escalated incidents.
- `POST /api/v1/incidents`: Escalate one or more alerts into a formal Security Incident.
- `POST /api/v1/incidents/{id}/comments`: Post forensic notes and triage commentary.
- `POST /api/v1/incidents/{id}/resolve`: Formally close incident upon remediation.

---

## 9. Endpoint Agent Client Specification

Distributed endpoint agents (Python daemon / Windows Sysmon collector) must strictly adhere to this communication lifecycle:

```
[Agent Boot]
     |
     v
[Has Saved API Key?] ---> YES ---> [Run Periodic Heartbeat & Ingestion]
     |                                    |
    NO                                    v
     |                             [POST /api/v1/agents/heartbeat]
     v                             Headers: X-Agent-Key
[Locate Enrollment Token]                 |
     |                                    v
     v                             [POST /api/v1/events/ingest/batch]
[POST /api/v1/agents/register]     Headers: X-Agent-Key
- enrollment_token                        |
- hostname, IP, OS                        v
     |                             [Response 201 Created]
     v
[Save agent_id & api_key securely]
```

### 9.1 Retry & Backoff Requirements
- Agents encountering `503 Service Unavailable` or connection timeouts must buffer logs locally up to 500 MB (FIFO eviction) and retry using truncated exponential backoff (initial: 2s, max: 60s, jitter: ±20%).
- If the agent receives `401 Unauthorized` during heartbeat or ingestion, it must flag its local state as *Credentials Revoked* and halt log transmission until re-enrolled.

---

## 10. Android Companion Application Contract

The MedSIEM Android application provides on-call SOC analysts with emergency alert triage and biometric authorization.

### 10.1 Authentication & Push Registration
1. **Login:** Authenticates using `POST /api/v1/auth/login`. Supports biometric fingerprint unlock bound to encrypted Android Keystore token storage.
2. **Push Token Enrollment:** Mobile client registers FCM device token to receive instant push alerts when `CRITICAL` or `HIGH` alerts are generated.

### 10.2 Emergency Alert Triage
- **`GET /api/v1/alerts?severity=CRITICAL&status_val=OPEN`**: Fetches active emergency queue.
- **`POST /api/v1/alerts/{id}/assign`**: Assigns alert to mobile analyst.
- **`POST /api/v1/incidents/{id}/comments`**: Allows mobile voice-to-text or quick forensic comment submission during active emergency response.
