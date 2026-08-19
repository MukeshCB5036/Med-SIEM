# MedSIEM Security Audit & Baseline Validation

MedSIEM follows strict OWASP Top 10 guidelines and DevSecOps automated quality gates.

---

## 🛡️ Security Audit Tools & Scope

1. **Bandit**: Static application security testing (SAST) for Python code in `backend/app`.
2. **Semgrep**: Code pattern scanner enforcing secure query parameterization and secrets detection.
3. **pip-audit / npm audit**: Automated dependency vulnerability scanners integrated into GitHub Actions CI.
4. **OWASP Security Headers**: Custom FastAPI middleware enforcing Strict-Transport-Security, Content-Security-Policy, and X-Frame-Options.

---

## 🔑 Hardened Baseline Audit
- **Secrets Management**: No hardcoded API keys or JWT secrets; configured dynamically via `Settings` and environment variables.
- **Password Storage**: Passlib bcrypt hashing with work factor 12.
- **Token Security**: Short-lived JWT Access Tokens (30m) and rotated Refresh Tokens (7d).
- **Account Lockout Policy**: 5 consecutive failed login attempts lock the user account automatically.
