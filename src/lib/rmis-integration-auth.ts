import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function hasValidBearerAuthorization(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
) {
  if (!authorizationHeader || !expectedToken) return false;

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  if (!match) return false;

  return timingSafeEqual(digest(match[1]), digest(expectedToken));
}

export const hasValidRmisProvisioningAuthorization = hasValidBearerAuthorization;
