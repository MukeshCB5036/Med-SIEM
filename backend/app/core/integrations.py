import redis
from opensearchpy import OpenSearch
from minio import Minio
from app.core.config import settings, logger

# Redis Connection Manager
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

def check_redis_health() -> bool:
    try:
        return redis_client.ping()
    except Exception as e:
        logger.warning(f"Redis healthcheck failed: {e}")
        return False

# OpenSearch Connection Manager
opensearch_client = OpenSearch(
    hosts=[{'host': settings.OPENSEARCH_HOST, 'port': settings.OPENSEARCH_PORT, 'scheme': settings.OPENSEARCH_SCHEME}],
    http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASSWORD) if settings.OPENSEARCH_USER else None,
    http_compress=True,
    use_ssl=settings.OPENSEARCH_USE_SSL,
    verify_certs=False,
    ssl_assert_hostname=False,
    ssl_show_warn=False
)

def check_opensearch_health() -> bool:
    try:
        return opensearch_client.ping()
    except Exception as e:
        logger.warning(f"OpenSearch healthcheck failed: {e}")
        return False

# MinIO Connection Manager
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)

def check_minio_health() -> bool:
    try:
        return minio_client.bucket_exists(settings.MINIO_REPORTS_BUCKET) or True
    except Exception as e:
        logger.warning(f"MinIO healthcheck failed: {e}")
        return False
