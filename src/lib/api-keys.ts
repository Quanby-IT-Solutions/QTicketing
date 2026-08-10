import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import {
  generateApiKeyToken,
  getApiKeyDisplayPrefix,
  hashApiKeyToken,
} from "@/lib/api-key-crypto";

export type ApiKeyMetadata = {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  expiresAt?: Date | null;
};

export type RevokeApiKeyInput = {
  userId: string;
  apiKeyId: string;
};

export class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyValidationError";
  }
}

const apiKeyMetadataSelection = {
  id: apiKeys.id,
  userId: apiKeys.userId,
  name: apiKeys.name,
  prefix: apiKeys.prefix,
  createdAt: apiKeys.createdAt,
  lastUsedAt: apiKeys.lastUsedAt,
  expiresAt: apiKeys.expiresAt,
  revokedAt: apiKeys.revokedAt,
};

export async function createApiKey(input: CreateApiKeyInput) {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    throw new ApiKeyValidationError("API key name must be between 1 and 80 characters.");
  }

  const expiresAt = input.expiresAt ?? null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    throw new ApiKeyValidationError("API key expiration must be in the future.");
  }

  const token = generateApiKeyToken();
  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      userId: input.userId,
      name,
      prefix: getApiKeyDisplayPrefix(token),
      tokenHash: hashApiKeyToken(token),
      expiresAt,
    })
    .returning(apiKeyMetadataSelection);

  if (!apiKey) throw new Error("Unable to create the API key.");

  return { apiKey, token };
}

export async function listApiKeys(userId: string): Promise<ApiKeyMetadata[]> {
  return db
    .select(apiKeyMetadataSelection)
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(input: RevokeApiKeyInput): Promise<ApiKeyMetadata | null> {
  const [apiKey] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, input.apiKeyId),
        eq(apiKeys.userId, input.userId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning(apiKeyMetadataSelection);

  return apiKey ?? null;
}
