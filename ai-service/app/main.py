import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes import router

logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("visionbridge-ai")

app = FastAPI(
    title=settings.SERVICE_NAME,
    description=(
        "VisionBridge Python AI & Computer Vision microservice. "
        "Provides foundational image validation and prepares architecture for "
        "future pretrained ocular computer-vision models."
    ),
    version=settings.API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware for Node.js backend & local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/", tags=["System"])
async def root():
    """Service landing page linking to documentation and health check."""
    return {
        "service": settings.SERVICE_NAME,
        "status": "ONLINE",
        "api_version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "health_check": "/health",
        "capabilities": "/api/v1/capabilities",
        "message": "VisionBridge AI & Computer Vision Service Foundation is running."
    }


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting VisionBridge AI Service on %s:%d", settings.HOST, settings.PORT)
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL
    )
