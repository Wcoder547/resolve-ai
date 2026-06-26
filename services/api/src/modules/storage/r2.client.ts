import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export function getR2Endpoint() {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    }
  });
}