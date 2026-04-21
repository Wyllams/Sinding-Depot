import { S3Client } from "@aws-sdk/client-s3";

// Ensure environment variables are present before instantiating the client
if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
  console.warn("⚠️ Cloudflare R2 credentials are missing from environment variables.");
}

/**
 * Cloudflare R2 Storage Client
 * Compatible with AWS S3 SDK v3.
 * 
 * Usage:
 * import { r2 } from "@/lib/r2";
 * import { PutObjectCommand } from "@aws-sdk/client-s3";
 * 
 * await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: "file.jpg", Body: buffer }));
 */
export const r2 = new S3Client({
  region: "auto", // Cloudflare R2 uses "auto" for region
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});
