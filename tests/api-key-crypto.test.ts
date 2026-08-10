import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  API_KEY_TOKEN_PREFIX,
  extractBearerToken,
  generateApiKeyToken,
  getApiKeyDisplayPrefix,
  hashApiKeyToken,
  isApiKeyToken,
} from "@/lib/api-key-crypto";

describe("API key token helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates unique, recognizable tokens with 256 bits of random key material", () => {
    const first = generateApiKeyToken();
    const second = generateApiKeyToken();

    expect(first).toMatch(/^qtk_live_[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^qtk_live_[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(isApiKeyToken(first)).toBe(true);
  });

  it("hashes the complete token with SHA-256", () => {
    const token = `${API_KEY_TOKEN_PREFIX}${"a".repeat(43)}`;
    const expected = createHash("sha256").update(token, "utf8").digest("hex");

    expect(hashApiKeyToken(token)).toBe(expected);
    expect(hashApiKeyToken(token)).toHaveLength(64);
    expect(hashApiKeyToken(`${token}x`)).not.toBe(expected);
  });

  it("returns a short display-safe prefix instead of the complete credential", () => {
    const token = `${API_KEY_TOKEN_PREFIX}${"a".repeat(43)}`;
    const prefix = getApiKeyDisplayPrefix(token);

    expect(prefix).toBe("qtk_live_aaaaaaaa");
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length);
  });

  it("extracts only well-formed qtk Bearer credentials", () => {
    const token = `${API_KEY_TOKEN_PREFIX}${"a".repeat(43)}`;

    expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    expect(extractBearerToken(`bearer\t${token}`)).toBe(token);
    expect(extractBearerToken(`  Bearer ${token}  `)).toBe(token);

    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(`Basic ${token}`)).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken(`Bearer ${token} extra`)).toBeNull();
    expect(extractBearerToken("Bearer qtk_live_too-short")).toBeNull();
  });

  it("rejects malformed tokens when producing a display prefix", () => {
    expect(() => getApiKeyDisplayPrefix("qtk_live_too-short")).toThrow("invalid API key");
  });
});
