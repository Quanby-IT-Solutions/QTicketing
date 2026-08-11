import { z } from "zod";

const optionalProvisioningToken = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(32).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  FRONTEND_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(24).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().min(1).max(120).optional(),
  TICKETING_PROVISIONING_TOKEN: optionalProvisioningToken,
  TICKETING_TICKET_API_KEY: optionalProvisioningToken,
  RMIS_PROVISIONING_TOKEN: optionalProvisioningToken,
  RMIS_TICKET_API_KEY: optionalProvisioningToken,
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://user:password@localhost:5432/ticketing",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "missing-access-key",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "missing-secret-key",
  AWS_REGION: process.env.AWS_REGION ?? "ap-southeast-1",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "missing-ticketing-bucket",
  FRONTEND_URL: process.env.FRONTEND_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_FROM_NAME: process.env.RESEND_FROM_NAME,
  TICKETING_PROVISIONING_TOKEN: process.env.TICKETING_PROVISIONING_TOKEN,
  TICKETING_TICKET_API_KEY: process.env.TICKETING_TICKET_API_KEY,
  RMIS_PROVISIONING_TOKEN: process.env.RMIS_PROVISIONING_TOKEN,
  RMIS_TICKET_API_KEY: process.env.RMIS_TICKET_API_KEY,
});
