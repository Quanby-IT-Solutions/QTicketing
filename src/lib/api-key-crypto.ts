import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const API_KEY_TOKEN_PREFIX = "qtk_live_";

const API_KEY_SECRET_BYTES = 32;
const API_KEY_SECRET_LENGTH = 43;
const API_KEY_DISPLAY_SECRET_LENGTH = 8;
const API_KEY_TOKEN_PATTERN = new RegExp(
  `^${API_KEY_TOKEN_PREFIX}[A-Za-z0-9_-]{${API_KEY_SECRET_LENGTH}}$`,
);

export function generateApiKeyToken() {
  return `${API_KEY_TOKEN_PREFIX}${randomBytes(API_KEY_SECRET_BYTES).toString("base64url")}`;
}

export function hashApiKeyToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isApiKeyToken(token: string) {
  return API_KEY_TOKEN_PATTERN.test(token);
}

export function getApiKeyDisplayPrefix(token: string) {
  if (!isApiKeyToken(token)) {
    throw new Error("Cannot create a display prefix from an invalid API key.");
  }

  return token.slice(0, API_KEY_TOKEN_PREFIX.length + API_KEY_DISPLAY_SECRET_LENGTH);
}

export function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return null;

  const match = /^Bearer[ \t]+(\S+)$/i.exec(authorizationHeader.trim());
  if (!match || !isApiKeyToken(match[1])) return null;

  return match[1];
}
