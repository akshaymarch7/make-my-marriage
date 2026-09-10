import { afterEach, describe, expect, it, vi } from "vitest";
import { readAuthBody, validateAuthRequest } from "./http";
afterEach(() => vi.unstubAllEnvs());
describe("auth HTTP boundary", () => {
  it("requires the configured origin for mutations", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    for (const origin of ["https://attacker.example", "null", ""]) {
      expect(() => validateAuthRequest(new Request("http://localhost:3000/api/auth/logout", { method: "POST", headers: { origin } }))).toThrow("Request origin is not allowed.");
    }
    expect(() => validateAuthRequest(new Request("http://localhost:3000/api/auth/logout", { method: "POST", headers: { origin: "http://localhost:3000" } }))).not.toThrow();
  });
  it("rejects unexpected query input", () => {
    expect(() => validateAuthRequest(new Request("http://localhost:3000/api/auth/me?weddingId=other"))).toThrow();
  });
  it("rejects malformed and oversized JSON", async () => {
    for (const body of ["{", JSON.stringify({ data: "a".repeat(8192) })]) {
      await expect(readAuthBody(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body }))).rejects.toMatchObject({ status: 400 });
    }
  });
});
