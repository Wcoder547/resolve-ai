import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const rawKey = env.INTEGRATION_SECRET_ENCRYPTION_KEY;

  const base64Key = Buffer.from(rawKey, "base64");

  if (base64Key.length === 32) {
    return base64Key;
  }

  return createHash("sha256").update(rawKey).digest();
}

export function encryptJson(value: unknown) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(value);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    encrypted: encrypted.toString("base64")
  });
}

export function decryptJson<T = unknown>(encryptedPayload: string): T {
  const key = getEncryptionKey();

  const payload = JSON.parse(encryptedPayload) as {
    algorithm: string;
    iv: string;
    authTag: string;
    encrypted: string;
  };

  if (payload.algorithm !== ALGORITHM) {
    throw new Error("Unsupported encryption algorithm.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, "base64")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}