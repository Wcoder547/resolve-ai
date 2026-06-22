from fastapi import FastAPI
from pydantic import BaseModel

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