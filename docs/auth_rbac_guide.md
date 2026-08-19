# MedSIEM Authentication & Authorization (RBAC) Guide

MedSIEM enforces a multi-tenant Role-Based Access Control (RBAC) system with granular permission boundaries for healthcare security analysts.

## Default System Roles & Permissions Matrix

| Role | Permissions | Use Case |
|---|---|---|
| **Super Admin** | `*` (All system & RBAC permissions) | Unrestricted system administration & tenant setup |
| **SOC Manager** | `users.read`, `alerts.read`, `alerts.update`, `incidents.manage`, `reports.export` | Oversees SOC incident lifecycle and analyst assignments |
| **SOC Analyst** | `alerts.read`, `alerts.update`, `incidents.manage` | Real-time threat triage and case management |
| **Incident Responder** | `alerts.read`, `alerts.update`, `incidents.manage` | Breach containment and remediation |
| **Compliance Officer** | `alerts.read`, `reports.export` | Healthcare regulatory audits (HIPAA, ISO 27001) |
| **Auditor** | `users.read`, `alerts.read`, `reports.export` | Read-only audit log review |
| **Viewer** | `alerts.read` | General dashboard read-only visibility |

---

## Security Policy Enforcement

1. **Account Lockout**: 5 consecutive failed authentication attempts automatically lock the user account.
2. **Password Complexity**: Passwords must contain minimum 8 characters with at least one uppercase letter, one lowercase letter, one numeric digit, and one special character.
3. **Audit Logging**: Every login attempt (success or failure) and password change generates an immutable `AuditLog` entry storing client IP and User-Agent.
