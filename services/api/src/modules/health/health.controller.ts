import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { getMetricsContentType, getMetricsText } from "../../lib/metrics.js";
import { getLivenessStatus, getReadinessStatus } from "./health.service.js";

function isAuthorizedForMetrics(req: Request) {
  if (!env.METRICS_TOKEN) {
    return true;
  }

  return req.headers.authorization === `Bearer ${env.METRICS_TOKEN}`;
}

export async function liveController(_req: Request, res: Response) {
  const data = await getLivenessStatus();

  return res.status(200).json({
    success: true,
    data
  });
}

export async function readyController(_req: Request, res: Response) {
  const data = await getReadinessStatus();

  const statusCode = data.status === "ok" ? 200 : 503;

  return res.status(statusCode).json({
    success: data.status === "ok",
    data
  });
}

export async function healthController(_req: Request, res: Response) {
  const data = await getReadinessStatus();

  const statusCode = data.status === "ok" ? 200 : 503;

  return res.status(statusCode).json({
    success: data.status === "ok",
    data
  });
}

export async function metricsController(req: Request, res: Response) {
  if (!env.ENABLE_METRICS) {
    return res.status(404).json({
      success: false,
      message: "Metrics are disabled."
    });
  }

  if (!isAuthorizedForMetrics(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  res.setHeader("Content-Type", getMetricsContentType());

  return res.status(200).send(await getMetricsText());
}