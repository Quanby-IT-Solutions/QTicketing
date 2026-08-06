import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  SESSION_SECRET: z.string().min(24).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://user:password@localhost:5432/ticketing",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "missing-access-key",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "missing-secret-key",
  AWS_REGION: process.env.AWS_REGION ?? "ap-southeast-1",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "missing-ticketing-bucket",
  SESSION_SECRET: process.env.SESSION_SECRET,
});
