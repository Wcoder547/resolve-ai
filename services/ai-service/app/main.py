from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.routes import agents
from app.routes import tools

from app.config.settings import get_settings
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logger import configure_logging
from app.middleware.request_context import RequestContextMiddleware
from app.routes.ingestion import router as ingestion_router
from app.routes.chat import router as chat_router

from fastapi import HTTPException, Request
from app.core.metrics import metrics_middleware, metrics_response

from app.routes import embeddings

settings = get_settings()

configure_logging(settings.environment)

app = FastAPI(
    title=settings.service_name,
    description="FastAPI service for document ingestion, RAG, LLM providers, and AI workflows.",
    version=settings.api_version,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)


if settings.enable_metrics:
    app.middleware("http")(metrics_middleware)

app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False if settings.allowed_origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    version: str


@app.get("/")
def root():
    return {
        "success": True,
        "service": settings.service_name,
        "status": "running",
        "version": settings.api_version,
        "environment": settings.environment,
    }


@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "environment": settings.environment,
        "version": settings.api_version,
    }


@app.get("/ready")
def ready():
    provider_ready = settings.selected_provider_has_key

    return {
        "success": provider_ready,
        "status": "ready" if provider_ready else "not_ready",
        "service": "ai-service",
        "provider": settings.llm_provider,
        "model": settings.selected_model,
        "providerApiKeyConfigured": provider_ready,
    }


@app.get("/ai/health", response_model=HealthResponse)
def ai_health():
    return {
        "status": "ok",
        "service": "ai-service",
        "environment": settings.environment,
        "version": settings.api_version,
    }


@app.get("/ai/provider")
def ai_provider():
    return {
        "success": True,
        "provider": settings.llm_provider,
        "model": settings.selected_model,
        "providerApiKeyConfigured": settings.selected_provider_has_key,
    }


@app.get("/live")
def live():
    return {
        "status": "ok",
        "service": settings.service_name,
        "version": settings.api_version,
    }


@app.get("/metrics")
def metrics(request: Request):
    if not settings.enable_metrics:
        raise HTTPException(status_code=404, detail="Metrics are disabled.")

    if settings.metrics_token:
        authorization = request.headers.get("authorization", "")

        if authorization != f"Bearer {settings.metrics_token}":
            raise HTTPException(status_code=401, detail="Unauthorized.")

    return metrics_response()

app.include_router(ingestion_router, prefix="/ai", tags=["Ingestion"])
app.include_router(chat_router, prefix="/ai", tags=["Chat"])
app.include_router(embeddings.router, prefix="/ai", tags=["embeddings"])
app.include_router(agents.router, prefix="/ai", tags=["agents"])
app.include_router(tools.router, prefix="/ai", tags=["tools"])