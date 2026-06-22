import jwt from "jsonwebtoken";
import { getEnv } from "./env";

export type AccessTokenPayload = {
  userId: string;
  email: string;
};

export type RefreshTokenPayload = {
  userId: string;
  type: "refresh";
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getEnv("JWT_ACCESS_SECRET"), {
    expiresIn: "15m"
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, getEnv("JWT_REFRESH_SECRET"), {
    expiresIn: "7d"
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getEnv("JWT_ACCESS_SECRET")) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getEnv("JWT_REFRESH_SECRET")) as RefreshTokenPayload;
}