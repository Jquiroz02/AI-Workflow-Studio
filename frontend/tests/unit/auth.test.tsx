import { describe, expect, it } from "vitest";

import { computeIsAuthConfigured, PLACEHOLDER_CLERK_PUBLISHABLE_KEY } from "@/lib/auth";

describe("computeIsAuthConfigured", () => {
  it("is false when the key is missing", () => {
    expect(computeIsAuthConfigured(undefined)).toBe(false);
    expect(computeIsAuthConfigured(null)).toBe(false);
    expect(computeIsAuthConfigured("")).toBe(false);
  });

  it("is false for the documented placeholder key", () => {
    expect(computeIsAuthConfigured(PLACEHOLDER_CLERK_PUBLISHABLE_KEY)).toBe(false);
  });

  it("is true for any other non-empty key", () => {
    expect(computeIsAuthConfigured("pk_test_a-real-looking-key")).toBe(true);
  });
});
