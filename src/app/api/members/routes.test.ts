import { beforeEach, expect, it, vi } from "vitest";
import { authenticatedAccount } from "@/modules/auth/service";
import { inviteMember, listMembers, listInvitations, revokeInvitation, getPublicInvitation, acceptInvitation } from "@/modules/memberships/service";
import { GET as members } from "./route";
import { GET as invitations, POST as invite } from "./invitations/route";
import { DELETE as revoke } from "./invitations/[invitationId]/route";
import { GET as publicInvitation } from "../public/member-invitations/[token]/route";
import { POST as accept } from "../member-invitations/[token]/accept/route";
vi.mock("@/modules/auth/service", () => ({ authenticatedAccount: vi.fn() }));
vi.mock("@/modules/memberships/service", () => ({ inviteMember: vi.fn(), listMembers: vi.fn(), listInvitations: vi.fn(), revokeInvitation: vi.fn(), getPublicInvitation: vi.fn(), acceptInvitation: vi.fn() }));
const token = "t".repeat(43), invitationId = "b".repeat(24), user = { id: "a".repeat(24), email: "family@example.test" };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); vi.mocked(authenticatedAccount).mockResolvedValue({ user } as never); });
function request(path: string, method = "GET", body?: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000${path}`, { method, headers: { origin, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
it("rejects unauthenticated reads and writes", async () => {
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  for (const response of [await members(request("/api/members")), await invitations(request("/api/members/invitations")), await invite(request("/api/members/invitations", "POST", {})), await revoke(request(`/api/members/invitations/${invitationId}`, "DELETE"), { params: Promise.resolve({ invitationId }) }), await accept(request(`/api/member-invitations/${token}/accept`, "POST"), { params: Promise.resolve({ token }) })]) expect(response.status).toBe(401);
  expect(inviteMember).not.toHaveBeenCalled(); expect(acceptInvitation).not.toHaveBeenCalled();
});
it("validates mutation origin, route parameters, query, and empty action bodies", async () => {
  expect((await invite(request("/api/members/invitations", "POST", {}, "https://elsewhere.test"))).status).toBe(403);
  expect((await members(request("/api/members?weddingId=other"))).status).toBe(400);
  expect((await revoke(request("/api/members/invitations/bad", "DELETE"), { params: Promise.resolve({ invitationId: "bad" }) })).status).toBe(400);
  expect((await accept(request(`/api/member-invitations/${token}/accept`, "POST", { weddingId: "other" }), { params: Promise.resolve({ token }) })).status).toBe(400);
  expect(revokeInvitation).not.toHaveBeenCalled(); expect(acceptInvitation).not.toHaveBeenCalled();
});
it("passes authenticated identity to services and disables caching", async () => {
  vi.mocked(listMembers).mockResolvedValue([]); vi.mocked(listInvitations).mockResolvedValue([]);
  const response = await members(request("/api/members")); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(listMembers).toHaveBeenCalledWith(user.id);
  expect((await invite(request("/api/members/invitations", "POST", { email: "family@example.test", role: "MANAGER" }))).status).toBe(201);
  expect(inviteMember).toHaveBeenCalledWith(user.id, { email: "family@example.test", role: "MANAGER" });
  expect((await revoke(request(`/api/members/invitations/${invitationId}`, "DELETE"), { params: Promise.resolve({ invitationId }) })).status).toBe(204);
  await accept(request(`/api/member-invitations/${token}/accept`, "POST"), { params: Promise.resolve({ token }) }); expect(acceptInvitation).toHaveBeenCalledWith(user, token);
});
it("allows public invitation reads without authentication and rejects malformed tokens", async () => {
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  expect((await publicInvitation(request(`/api/public/member-invitations/${token}`), { params: Promise.resolve({ token }) })).status).toBe(200);
  expect(getPublicInvitation).toHaveBeenCalledWith(token);
  expect((await publicInvitation(request("/api/public/member-invitations/bad"), { params: Promise.resolve({ token: "bad" }) })).status).toBe(400);
});
