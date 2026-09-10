import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { authenticatedAccount } from "@/modules/auth/service";
import { revokeSession } from "@/server/auth/sessions";

vi.mock("@/modules/auth/service", () => ({ authenticatedAccount: vi.fn() }));
vi.mock("@/server/auth/sessions", async importOriginal => ({
  ...await importOriginal<typeof import("@/server/auth/sessions")>(),
  revokeSession: vi.fn(),
}));
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("AUTH_TOKEN_PEPPER", "test-pepper-at-least-thirty-two-characters");
});

it.each([undefined, "", "{}"])("revokes the session and clears the cookie for body %j", async body => {
  vi.mocked(authenticatedAccount).mockResolvedValue({ sessionId: "test-session" } as never);
  const response = await POST(new Request("http://localhost:3000/api/auth/logout", {
    method: "POST", headers: { origin: "http://localhost:3000", ...(body === "{}" ? { "Content-Type": "application/json" } : {}) }, body,
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
  expect(revokeSession).toHaveBeenCalledWith("test-session");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});

it("still rejects nonempty non-JSON bodies", async () => {
  const response = await POST(new Request("http://localhost:3000/api/auth/logout", {
    method: "POST", headers: { origin: "http://localhost:3000" }, body: "unexpected",
  }));
  expect(response.status).toBe(400);
  expect(revokeSession).not.toHaveBeenCalled();
});
