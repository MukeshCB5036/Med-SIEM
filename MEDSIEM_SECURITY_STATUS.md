# MEDSIEM — SECURITY POSTURE & VULNERABILITY AUDIT

**Audit Date:** November 2, 2026  
**Auditor:** Cybersecurity Engineer & Technical Project Auditor  
**Standard Benchmarks:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), HIPAA Security Rule (45 CFR § 164.312).

---

## 1. Security Architecture Evaluation

### 1.1 JWT Implementation & Session Management
- **Cryptographic Standard:** HMAC-SHA256 (`HS256`) utilizing `SECRET_KEY` loaded from environment variables (`.env`).
- **Token Lifecycles:**
  - `access_token`: 30-minute validity. Payload carries subject UUID (`sub`).
  - `refresh_token`: 7-day validity. Payload carries subject UUID (`sub`) and type indicator (`"type": "refresh"`).
- **Validation:** `decode_token()` checks signature and expiration via PyJWT.
- **Vulnerability Assessment:** 
  - Token revocation on `/auth/logout` is client-side only (localStorage purge). Revoked access tokens remain technically valid server-side until the 30-minute expiration window closes because no Redis-backed blocklist is checked in `get_current_user`.
  - **Risk Level:** *Low* (Standard for stateless JWTs; mitigated by 30-minute window).

### 1.2 Password Storage & Hashing
- **Algorithm:** **bcrypt** via passlib `CryptContext(schemes=["bcrypt"], deprecated="auto")`.
- **Salt Generation:** Automatic cryptographically secure per-password 12-round salt.
- **Verification:** Constant-time verification preventing timing side-channel attacks.
- **Evaluation:** **PASSED** (Industry standard; no plaintext passwords stored).

### 1.3 Multi-Factor Authentication (MFA)
- **Mechanism:** Time-bounded One-Time Passcode (OTP) delivered to user's registered email.
- **Entropy:** 6-digit numeric string generated via `secrets.randbelow(1000000)` (cryptographically secure pseudorandom number generator).
- **Storage:** Stored in database as a **SHA-256 digest** (`otp_hash`). Plaintext OTP is never stored in DB.
- **Safeguards:**
  - 5-minute validity window (`otp_expires_at`).
  - Rate limiting & lockout: After 5 incorrect OTP attempts (`otp_attempts >= 5`), account is locked (`is_locked = True`) and OTP is invalidated.
  - Constant-time comparison using `secrets.compare_digest`.
  - Intermediate token requirement: Step 2 requires valid `mfa_token`.
- **Policy Enforcement:** Required for `is_superuser = True` and roles `Super Admin` and `SOC Manager`.
- **Evaluation:** **PASSED**.

### 1.4 Role-Based Access Control (RBAC) & Super Admin Restrictions
- **Authorization Engine:** `PermissionChecker(required_permission)` and `require_superuser` FastAPI dependencies.
- **User Creation Boundary:** `POST /api/v1/users` is explicitly guarded by `require_superuser`. Standard SOC Analysts or external callers cannot register users or escalate privileges.
- **System Role Protection:** System roles (`Super Admin`) cannot be deleted via API (`delete_role` checks `role.is_system_role`).
- **Evaluation:** **PASSED**.

### 1.5 IDOR (Insecure Direct Object Reference) Protection
- **Multi-Tenancy Scoping:** Most database queries scope to `org_id` or check tenant membership.
- **Findings:**
  - In `backend/app/modules/assets/services.py` and `detection/services.py`, entities are queried primarily by primary key UUID (`id`). In the current deployment with a single organization (`MEDSIEM_HQ`), this is safe. In a multi-tenant commercial SaaS deployment, queries should strictly include `filter(Entity.org_id == current_user.org_id)`.
- **Risk Level:** *Low* (Theoretical risk for multi-tenant future scale; currently single tenant).

### 1.6 Injection Defenses (SQLi & XSS)
- **SQL Injection:** **Zero raw SQL strings.** All database operations use SQLAlchemy ORM parameterized queries (`query.filter(...)`). In `test_sql_injection_resilience`, SQLi strings (`' OR '1'='1`, `'; DROP TABLE users; --`) were safely escaped and treated as literal search text.
- **Cross-Site Scripting (XSS):** React / Next.js auto-escapes rendered text. No `dangerouslySetInnerHTML` instances exist in the frontend.
- **Evaluation:** **PASSED**.

### 1.7 HTTP Security Headers & CORS
- **Middleware:** `SecurityHeadersAndTracingMiddleware` injects:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (Clickjacking defense)
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
  - `Content-Security-Policy: default-src 'self'`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **CORS:** Restricted to explicitly whitelisted web origins:
  - `http://localhost:3000`
  - `http://localhost:8000`
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:8000`
- **Evaluation:** **PASSED**.

### 1.8 Secrets Management
- **Configuration:** Handled via Pydantic `BaseSettings` reading from `.env`.
- **Protection:** `.env` is listed in `.gitignore`. `.env.example` provides sanitised placeholders without actual secrets.
- **Evaluation:** **PASSED**.

### 1.9 Container & Docker Security
- **PostgreSQL:** Isolated within Docker internal network; credentials passed via environment variables.
- **OpenSearch:** Security plugin disabled (`DISABLE_SECURITY_PLUGIN=true`) for low-overhead local container networking. While suitable for internal Docker environments, if OpenSearch port 9200 is bound to `0.0.0.0` on a public server, it would expose unauthenticated log search. In `docker-compose.yml`, port 9200 is exposed to host.
- **Recommendation:** Restrict OpenSearch port binding to `127.0.0.1:9200` in production compose or enable basic authentication.

---

## 2. Vulnerability Categorization

### Verified Critical Vulnerabilities: 0
No active remote code execution, SQL injection, authentication bypass, or plaintext credential leak exists in the audited codebase.

### Theoretical Risks & Hardening Opportunities:
1. **OpenSearch Port Binding:** Port 9200 binds to all host interfaces with security plugin disabled. For external cloud deployment, bind only to `127.0.0.1:9200` or container network.
2. **Server-Side Token Revocation:** Add Redis token blacklist on logout to instantly invalidate access tokens prior to 30-minute expiry.
3. **Tenant Boundary Hardening:** Explicitly filter asset and incident lookups by `current_user.org_id` when expanding beyond single-tenant architecture.
