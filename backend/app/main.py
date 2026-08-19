from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import SecurityHeadersAndTracingMiddleware
from app.core.exceptions import MedSIEMException
from app.core.integrations import check_redis_health, check_opensearch_health, check_minio_health
from app.modules.auth.router import router as auth_router
from app.modules.assets.router import router as assets_router
from app.modules.events.router import router as events_router
from app.modules.detection.router import router as detection_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Custom Middlewares
app.add_middleware(SecurityHeadersAndTracingMiddleware)

# CORS Configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Exception Handlers
@app.exception_handler(MedSIEMException)
async def medsiem_exception_handler(request: Request, exc: MedSIEMException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "data": None,
            "error": exc.message,
            "meta": {"code": exc.code, "details": exc.details}
        }
    )


@app.get("/health", tags=["Health"])
def health_check():
    """Comprehensive system health check endpoint."""
    services_status = {
        "redis": check_redis_health(),
        "opensearch": check_opensearch_health(),
        "minio": check_minio_health()
    }
    all_healthy = all(services_status.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "services": services_status
    }


# Include Module API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(assets_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(detection_router, prefix=settings.API_V1_STR)
