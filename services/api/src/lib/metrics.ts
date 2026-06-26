import client from "prom-client";

export const metricsRegister = new client.Registry();

client.collectDefaultMetrics({
  register: metricsRegister,
  prefix: "resolveai_api_"
});

export const httpRequestsTotal = new client.Counter({
  name: "resolveai_api_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegister]
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "resolveai_api_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [metricsRegister]
});

export const healthCheckStatusGauge = new client.Gauge({
  name: "resolveai_api_health_check_status",
  help: "Health check status where 1 means ok and 0 means failing",
  labelNames: ["dependency"],
  registers: [metricsRegister]
});

export async function getMetricsText() {
  return metricsRegister.metrics();
}

export function getMetricsContentType() {
  return metricsRegister.contentType;
}