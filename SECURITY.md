# MedSIEM Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The MedSIEM engineering team takes security vulnerabilities seriously, especially given our focus on healthcare environments handling Sensitive Health Information (PHI/EHR).

If you discover a security vulnerability within MedSIEM, please follow these reporting steps:

1. **Do NOT open a public GitHub issue.**
2. Send an email to `security@medsiem.org` containing:
   - Type of issue (e.g. SQLi, XSS, Auth Bypass, Privilege Escalation).
   - Step-by-step instructions to reproduce the vulnerability.
   - Proof-of-concept payload (if applicable).
   - Impact assessment on HIPAA/PHI confidentiality.

3. You will receive an initial response within 24 hours.
4. We will issue a patch release as quickly as possible.
