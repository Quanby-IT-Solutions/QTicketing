import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const maxAttachmentBytes = 10 * 1024 * 1024;
export const attachmentSizeErrorMessage = "Attachments must be between 1 byte and 10 MB.";

export async function uploadTicketAttachment(ticketId: string, file: File) {
  if (file.size <= 0 || file.size > maxAttachmentBytes) {
    throw new Error(attachmentSizeErrorMessage);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "-");
  const objectKey = `tickets/${ticketId}/${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: objectKey,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return {
    objectKey,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}

export async function deleteTicketAttachments(objectKeys: string[]) {
  if (objectKeys.length === 0) return;

  await Promise.all(
    objectKeys.map((objectKey) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: objectKey,
        }),
      ),
    ),
  );
}

export async function getAttachmentDownloadUrl(objectKey: string) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: objectKey,
    }),
    { expiresIn: 60 * 5 },
  );
}

