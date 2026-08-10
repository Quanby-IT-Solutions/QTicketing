"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createApiKey, revokeApiKey } from "@/lib/api-keys";

const allowedExpiryDays = new Set([30, 90, 365]);

export async function createApiKeyAction(formData: FormData) {
  const currentUser = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const expiresInDays = Number(formData.get("expiresInDays") ?? 90);

  if (name.length < 1 || name.length > 80) {
    throw new Error("API key names must be between 1 and 80 characters.");
  }

  if (!allowedExpiryDays.has(expiresInDays)) {
    throw new Error("Choose a valid API key expiration period.");
  }

  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  );
  const { token } = await createApiKey({
    userId: currentUser.id,
    name,
    expiresAt,
  });

  revalidatePath("/settings");

  return { token };
}

export async function revokeApiKeyAction(formData: FormData) {
  const currentUser = await requireUser();
  const apiKeyId = String(formData.get("apiKeyId") ?? "").trim();

  if (!apiKeyId) throw new Error("API key ID is required.");

  const revoked = await revokeApiKey({
    userId: currentUser.id,
    apiKeyId,
  });

  if (!revoked) {
    throw new Error("This API key was not found or has already been revoked.");
  }

  revalidatePath("/settings");
}
