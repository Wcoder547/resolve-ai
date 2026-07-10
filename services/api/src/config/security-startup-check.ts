import { env } from "./env.js";
import { logger } from "../lib/logger.js";

const UNSAFE_SECRET_PATTERNS = [
  "change_this",
  "test_",
  "password",
  "secret",
  "123456",
  "resolveai_password"
];

function looksUnsafeSecret(value: string) {
  const normalized = value.toLowerCase();

  return UNSAFE_SECRET_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

function assertStrongSecret(input: {
  name: string;
  value: string;
  minLength?: number;
  failures: string[];
}) {
  const minLength = input.minLength ?? 32;

  if (!input.value || input.value.length < minLength) {
    input.failures.push(
      `${input.name} must be at least ${minLength} characters in production.`
    );
    return;
  }

  if (looksUnsafeSecret(input.value)) {
    input.failures.push(
      `${input.name} appears to contain a default/test/unsafe value.`
    );
  }
}

export function runSecurityStartupChecks() {
  if (!env.SECURITY_STARTUP_CHECKS_ENABLED) {
    logger.warn("Security startup checks are disabled.");
    return;
  }

  const failures: string[] = [];
  const warnings: string[] = [];

  if (env.NODE_ENV !== "production") {
    logger.info("Security startup checks skipped for non-production mode.");
    return;
  }

  assertStrongSecret({
    name: "JWT_ACCESS_SECRET",
    value: env.JWT_ACCESS_SECRET,
    minLength: 32,
    failures
  });

  assertStrongSecret({
    name: "JWT_REFRESH_SECRET",
    value: env.JWT_REFRESH_SECRET,
    minLength: 32,
    failures
  });

  assertStrongSecret({
    name: "INTEGRATION_SECRET_ENCRYPTION_KEY",
    value: env.INTEGRATION_SECRET_ENCRYPTION_KEY,
    minLength: 16,
    failures
  });

  if (env.CORS_ORIGIN === "*" || env.CORS_ORIGIN.trim() === "") {
    failures.push("CORS_ORIGIN must be a specific frontend URL in production.");
  }

  if (
    env.REQUIRE_HTTPS_IN_PRODUCTION &&
    !env.CORS_ORIGIN.startsWith("https://")
  ) {
    failures.push("CORS_ORIGIN must use HTTPS in production.");
  }

  if (env.AGENT_RUN_DEBUG_PAYLOAD_ENABLED) {
    warnings.push(
      "AGENT_RUN_DEBUG_PAYLOAD_ENABLED is enabled in production. Disable unless actively debugging."
    );
  }

  if (!env.TRUST_PROXY) {
    warnings.push(
      "TRUST_PROXY is disabled. Enable it when running behind Caddy/reverse proxy."
    );
  }

  if (!env.BLOCK_PRIVATE_NETWORK_INTEGRATIONS) {
    warnings.push(
      "BLOCK_PRIVATE_NETWORK_INTEGRATIONS is disabled. This increases SSRF risk."
    );
  }

  if (warnings.length > 0) {
    logger.warn(
      {
        warnings
      },
      "Production security warnings detected"
    );
  }

  if (failures.length > 0) {
    logger.error(
      {
        failures
      },
      "Production security startup checks failed"
    );

    throw new Error(
      `Production security startup checks failed: ${failures.join(" ")}`
    );
  }

  logger.info("Production security startup checks passed.");
}