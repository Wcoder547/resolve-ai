import { createHash, randomUUID } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { signRefreshToken } from "../../utils/jwt.js";

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createUniqueOrganizationSlug(name: string) {
  const baseSlug = createSlug(name) || `org-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function getRefreshTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

export async function createStoredRefreshToken(userId: string) {
  const refreshToken = signRefreshToken({
    userId,
    type: "refresh",
    tokenId: randomUUID()
  });

  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getRefreshTokenExpiry()
    }
  });

  return refreshToken;
}