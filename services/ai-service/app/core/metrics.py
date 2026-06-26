from time import perf_counter

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest


http_requests_total = Counter(
    "resolveai_ai_http_requests_total",
    "Total number of HTTP requests handled by the AI service.",
    ["method", "path", "status_code"],
)

http_request_duration_seconds = Histogram(
    "resolveai_ai_http_request_duration_seconds",
    "HTTP request duration in seconds for the AI service.",
    ["method", "path", "status_code"],
    buckets=[0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10, 30, 60],
)


async def metrics_middleware(request: Request, call_next):
    if request.url.path == "/metrics":
        return await call_next(request)

    started_at = perf_counter()
    status_code = "500"

    try:
        response = await call_next(request)
        status_code = str(response.status_code)
        return response
    finally:
        duration = perf_counter() - started_at

        http_requests_total.labels(
            method=request.method,
            path=request.url.path,
            status_code=status_code,
        ).inc()

        http_request_duration_seconds.labels(
            method=request.method,
            path=request.url.path,
            status_code=status_code,
        ).observe(duration)


def metrics_response():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )