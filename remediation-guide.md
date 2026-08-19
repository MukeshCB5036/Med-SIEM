# MedSIEM Security & Architecture Remediation Guide

## Overview
This guide provides actionable remediation instructions for identified security findings, developer configuration guidelines, and operational procedures.

## 1. Authentication & Session Security
- **MFA Enforcement**: All privileged users (`Super Admin`, `SOC Manager`) MUST complete the 6-digit OTP verification flow.
- **Token Invalidation**: Ensure client clears `access_token` and `refresh_token` from `localStorage` upon logout.

## 2. API Endpoint Protection
- **Role-Based Access Control**: Standard SOC analysts MUST NOT possess `is_superuser=True`. Verify `require_superuser` dependency on all administrative user-creation endpoints (`POST /api/v1/users`).
- **Database Timezones**: Use UTC timezone-aware datetimes (`datetime.now(timezone.utc)`) across all database timestamp fields to prevent SQLite/PostgreSQL comparison errors.

## 3. Production Deployment Hardening
- Change default secrets (`JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`).
- Enable HTTPS / TLS on Uvicorn via reverse proxy (Nginx / Cloudflare).
- Set `ENVIRONMENT=production` in `.env` to disable Swagger UI (`/docs`) in production environments.
