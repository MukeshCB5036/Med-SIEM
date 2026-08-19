# Environment Configuration Guide — MedSIEM

MedSIEM uses environment variables for configuration. Default development settings are specified in `backend/app/core/config.py`.

## Core Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | Runtime environment (`development`, `staging`, `production`) |
| `DEBUG` | `True` | Debug mode toggle |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `SECRET_KEY` | `medsiem_super_secret_jwt_key_...` | JWT secret signing key |
| `POSTGRES_SERVER` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `medsiem_user` | Database user |
| `POSTGRES_PASSWORD` | `medsiem_secure_password_2026` | Database password |
| `POSTGRES_DB` | `medsiem_db` | Database name |
| `OPENSEARCH_HOST` | `localhost` | OpenSearch cluster host |
| `OPENSEARCH_PORT` | `9200` | OpenSearch HTTP port |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO S3 endpoint |
| `MINIO_ACCESS_KEY` | `medsiem_minio_admin` | MinIO root user |
| `MINIO_SECRET_KEY` | `medsiem_minio_secret_key_2026` | MinIO root secret |
