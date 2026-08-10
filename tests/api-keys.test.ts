import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: dbMock }));

import { ApiKeyValidationError, createApiKey } from "@/lib/api-keys";

describe("API key service", () => {
  beforeEach(() => {
    dbMock.insert.mockReset();
  });

  it("rejects invalid names and expiration dates before accessing the database", async () => {
    await expect(createApiKey({ userId: "user-id", name: "   " })).rejects.toBeInstanceOf(
      ApiKeyValidationError,
    );
    await expect(createApiKey({ userId: "user-id", name: "a".repeat(81) })).rejects.toBeInstanceOf(
      ApiKeyValidationError,
    );
    await expect(
      createApiKey({ userId: "user-id", name: "CI", expiresAt: new Date(Date.now() - 1_000) }),
    ).rejects.toBeInstanceOf(ApiKeyValidationError);
    await expect(
      createApiKey({ userId: "user-id", name: "CI", expiresAt: new Date(Number.NaN) }),
    ).rejects.toBeInstanceOf(ApiKeyValidationError);

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("returns the raw credential once while passing only its hash and prefix to storage", async () => {
    const createdAt = new Date();
    const returning = vi.fn().mockResolvedValue([
      {
        id: "key-id",
        userId: "user-id",
        name: "RMIS integration",
        prefix: "qtk_live_example1",
        createdAt,
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    const result = await createApiKey({ userId: "user-id", name: "  RMIS integration  " });
    const storedValue = values.mock.calls[0][0];

    expect(result.token).toMatch(/^qtk_live_[A-Za-z0-9_-]{43}$/);
    expect(result.apiKey.name).toBe("RMIS integration");
    expect(storedValue).toMatchObject({
      userId: "user-id",
      name: "RMIS integration",
      prefix: result.token.slice(0, 17),
      expiresAt: null,
    });
    expect(storedValue.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedValue.tokenHash).not.toContain(result.token);
    expect(storedValue).not.toHaveProperty("token");
  });
});
