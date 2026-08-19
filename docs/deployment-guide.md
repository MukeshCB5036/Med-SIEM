# MedSIEM Deployment & Operations Guide

This guide covers production deployment of MedSIEM using Docker Compose.

## 🚀 Multi-Service Production Deployment

### 1. Environment Preparation
Copy `.env.example` to `.env` and configure production secrets:
```bash
cp .env.example .env
```

### 2. Launching Docker Services
```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

### 3. Container Verification & Health Checks
```bash
docker-compose -f docker/docker-compose.yml ps
```
Services initialized:
- `medsiem-backend` (Port 8000)
- `medsiem-frontend` (Port 3000)
- `medsiem-postgres` (Port 5432)
- `medsiem-redis` (Port 6379)
- `medsiem-opensearch` (Port 9200)
- `medsiem-minio` (Port 9000/9001)
