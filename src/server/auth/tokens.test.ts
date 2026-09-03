import { describe, expect, it } from "vitest";

import { generateSecureToken, hashToken } from "./tokens";

describe("authentication token utilities", () => {
  it("generates distinct URL-safe tokens", () => {
    const first = generateSecureToken();
    const second = generateSecureToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes a token deterministically without preserving the raw token", () => {
    const token = "example-token";
    const pepper = "a-pepper-that-is-long-enough-for-a-test";

    expect(hashToken(token, pepper)).toBe(hashToken(token, pepper));
    expect(hashToken(token, pepper)).not.toContain(token);
  });
});
