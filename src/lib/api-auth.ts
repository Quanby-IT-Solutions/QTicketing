import "server-only";

import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, projects, userProjects, users, type UserRole } from "@/db/schema";
import { extractBearerToken, hashApiKeyToken } from "@/lib/api-key-crypto";

export type AuthenticatedApiUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  projectIds: string[];
  apiKeyId: string;
};

export async function authenticateApiRequest(request: Request): Promise<AuthenticatedApiUser | null> {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return null;

  const now = new Date();
  const tokenHash = hashApiKeyToken(token);

  const [credential] = await db
    .select({
      apiKeyId: apiKeys.id,
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(
      and(
        eq(apiKeys.tokenHash, tokenHash),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        eq(users.active, true),
        eq(users.status, "approved"),
      ),
    )
    .limit(1);

  if (!credential) return null;

  // Recheck the key's live state while recording its use. This closes the gap
  // where a key could be revoked or expire immediately after the select above.
  const [usedKey] = await db
    .update(apiKeys)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(apiKeys.id, credential.apiKeyId),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
      ),
    )
    .returning({ id: apiKeys.id });

  if (!usedKey) return null;

  const projectRows = await db
    .select({ projectId: userProjects.projectId })
    .from(userProjects)
    .innerJoin(projects, eq(userProjects.projectId, projects.id))
    .where(and(eq(userProjects.userId, credential.id), eq(projects.active, true)));

  return {
    ...credential,
    projectIds: projectRows.map(({ projectId }) => projectId),
  };
}
