import { env } from "../config/env.js";

type EnvKey = keyof typeof env;

export function getEnv(name: EnvKey): string {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return String(value);
}