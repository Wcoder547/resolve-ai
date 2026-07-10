import dns from "dns/promises";
import net from "net";
import { env } from "../config/env.js";

function createBadRequestError(message: string) {
  const error = new Error(message);
  error.name = "BadRequestError";
  return error;
}

function getAllowedHosts() {
  return env.INTEGRATION_ALLOWED_HOSTS.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);

    const [a, b] = parts;

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;

    return false;
  }

  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase();

    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80")
    );
  }

  return false;
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "metadata.google.internal"
  );
}

export async function assertSafeOutboundUrl(urlValue: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlValue);
  } catch {
    throw createBadRequestError("Invalid webhook URL.");
  }

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw createBadRequestError("Webhook URL must use http or https.");
  }

  if (env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
    throw createBadRequestError("Webhook URL must use HTTPS in production.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  const allowedHosts = getAllowedHosts();

  if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw createBadRequestError(
      `Webhook host is not in INTEGRATION_ALLOWED_HOSTS: ${hostname}`
    );
  }

  if (!env.BLOCK_PRIVATE_NETWORK_INTEGRATIONS) {
    return parsedUrl.toString();
  }

  if (isLocalHostname(hostname)) {
    throw createBadRequestError("Private/local webhook hosts are not allowed.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw createBadRequestError("Private IP webhook URLs are not allowed.");
    }

    return parsedUrl.toString();
  }

  const resolvedAddresses = await dns.lookup(hostname, {
    all: true
  });

  for (const address of resolvedAddresses) {
    if (isPrivateIp(address.address)) {
      throw createBadRequestError(
        "Webhook URL resolves to a private network address."
      );
    }
  }

  return parsedUrl.toString();
}