import { beforeEach, expect, it, vi } from "vitest";
import { authenticatedAccount } from "@/modules/auth/service";
import { changeMemberRole, removeMember } from "@/modules/memberships/service";
import { PATCH, DELETE } from "./route";
vi.mock("@/modules/auth/service", () => ({ authenticatedAccount: vi.fn() }));
vi.mock("@/modules/memberships/service", () => ({ changeMemberRole: vi.fn(), removeMember: vi.fn() }));
const id = "b".repeat(24), userId = "a".repeat(24), context = { params: Promise.resolve({ membershipId: id }) };
const request = (method: string, body?: unknown, origin = "http://localhost:3000") => new Request(`http://localhost:3000/api/members/${id}`, { method, headers: { origin, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); vi.mocked(authenticatedAccount).mockResolvedValue({ user: { id: userId } } as never); });
it("authenticates role changes and removals", async () => {
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  expect((await PATCH(request("PATCH", { role: "ADMIN" }), context)).status).toBe(401);
  expect((await DELETE(request("DELETE"), context)).status).toBe(401);
});
it("validates origin, parameters, query, and empty removal bodies", async () => {
  expect((await PATCH(request("PATCH", {}, "https://other.test"), context)).status).toBe(403);
  expect((await DELETE(request("DELETE"), { params: Promise.resolve({ membershipId: "bad" }) })).status).toBe(400);
  expect((await DELETE(request("DELETE", { weddingId: "other" }), context)).status).toBe(400);
  expect((await DELETE(new Request(`http://localhost:3000/api/members/${id}?weddingId=other`, { method: "DELETE", headers: { origin: "http://localhost:3000" } }), context)).status).toBe(400);
  expect(removeMember).not.toHaveBeenCalled(); expect(changeMemberRole).not.toHaveBeenCalled();
});
it("passes the authenticated user and target id to services and prevents response caching", async () => {
  vi.mocked(changeMemberRole).mockResolvedValue({ membershipId: id, role: "MANAGER" });
  const response = await PATCH(request("PATCH", { role: "MANAGER" }), context);
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(changeMemberRole).toHaveBeenCalledWith(userId, id, { role: "MANAGER" });
  expect((await DELETE(request("DELETE"), context)).status).toBe(204); expect(removeMember).toHaveBeenCalledWith(userId, id);
});
