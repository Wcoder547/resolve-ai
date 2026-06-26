import type { NextFunction, Request, Response } from "express";
import {
  httpRequestDurationSeconds,
  httpRequestsTotal
} from "../lib/metrics.js";

function getRouteLabel(req: Request) {
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }

  return req.path;
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    if (req.path === "/metrics") {
      return;
    }

    const durationSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status_code: String(res.statusCode)
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}