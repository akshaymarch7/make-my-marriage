import { beforeEach, describe, expect, it, vi } from "vitest";

describe("environment configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("loads database configuration without requiring auth configuration", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    vi.stubEnv("MONGODB_DB_NAME", "make-my-marriage-test");
    vi.stubEnv("AUTH_TOKEN_PEPPER", "");

    const { getDatabaseEnv } = await import("./env");

    expect(getDatabaseEnv()).toEqual({
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB_NAME: "make-my-marriage-test",
    });
  });
});
