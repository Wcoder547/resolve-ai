from fastapi import FastAPI
from pydantic import BaseModel
from app.routes.ingestion import router as ingestion_router
from app.routes.chat import router as chat_router

app = FastAPI(
    title="ResolveAI AI Service",
    description="FastAPI service for RAG pipelines, LLM workflows, and agentic AI.",
    version="1.0.0"
)


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/")
def root():
    return {
        "service": "ResolveAI AI Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "service": "ai-service"
    }


@app.get("/ai/health", response_model=HealthResponse)
def ai_health():
    return {
        "status": "ok",
        "service": "ai-service"
    }


app.include_router(ingestion_router, prefix="/ai", tags=["Ingestion"])
app.include_router(chat_router, prefix="/ai/chat", tags=["Chat"])