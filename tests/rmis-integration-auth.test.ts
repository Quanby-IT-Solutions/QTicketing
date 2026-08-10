import { describe, expect, it } from "vitest";
import { hasValidRmisProvisioningAuthorization } from "@/lib/rmis-integration-auth";

const token = "rmis-provisioning-token-that-is-long-enough";

describe("RMIS integration authentication", () => {
  it("accepts the configured Bearer token", () => {
    expect(hasValidRmisProvisioningAuthorization(`Bearer ${token}`, token)).toBe(true);
    expect(hasValidRmisProvisioningAuthorization(`bearer ${token}`, token)).toBe(true);
  });

  it("rejects missing, malformed, and incorrect credentials", () => {
    expect(hasValidRmisProvisioningAuthorization(null, token)).toBe(false);
    expect(hasValidRmisProvisioningAuthorization(`Basic ${token}`, token)).toBe(false);
    expect(hasValidRmisProvisioningAuthorization("Bearer wrong-token", token)).toBe(false);
    expect(hasValidRmisProvisioningAuthorization(`Bearer ${token}`, undefined)).toBe(false);
  });
});
