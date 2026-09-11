import { beforeEach, expect, it, vi } from "vitest";
import { inviteMember, listMembers, listInvitations, revokeInvitation, getPublicInvitation, acceptInvitation, changeMemberRole, removeMember } from "./service";
import { findMembership, listWeddingMemberships, mutateWeddingMember } from "./repository";
import { findWedding } from "@/modules/weddings/repository";
import { findPublicUsersByIds, findUserByEmail } from "@/modules/auth/repository";
import { getInvitationEmailConfig, sendMemberInvitationEmail } from "@/server/email/member-invitation";
import { acceptInvitationAtomically, findInvitationByHash, insertInvitation, listPendingInvitations, revokePendingInvitation } from "./invitation-repository";
import { inviteMemberSchema } from "./schemas";
vi.mock("./repository", () => ({ findMembership: vi.fn(), listWeddingMemberships: vi.fn(), mutateWeddingMember: vi.fn() }));
vi.mock("@/modules/weddings/repository", () => ({ findWedding: vi.fn() }));
vi.mock("@/modules/auth/repository", () => ({ findPublicUsersByIds: vi.fn(), findUserByEmail: vi.fn() }));
vi.mock("@/server/email/member-invitation", () => ({ getInvitationEmailConfig: vi.fn(), sendMemberInvitationEmail: vi.fn() }));
vi.mock("@/config/env", () => ({ getAuthEnv: () => ({ AUTH_TOKEN_PEPPER: "p".repeat(32) }) }));
vi.mock("./invitation-repository", async importOriginal => ({ ...await importOriginal<typeof import("./invitation-repository")>(), acceptInvitationAtomically: vi.fn(), findInvitationByHash: vi.fn(), insertInvitation: vi.fn(), listPendingInvitations: vi.fn(), revokePendingInvitation: vi.fn() }));
const owner = "a".repeat(24), weddingId = "b".repeat(24), invitationId = "c".repeat(24), token = "t".repeat(43);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "ADMIN" });
  vi.mocked(findWedding).mockResolvedValue({ brideName: "A", groomName: "B" } as never);
  vi.mocked(findUserByEmail).mockResolvedValue(null);
  vi.mocked(insertInvitation).mockResolvedValue({ id: invitationId, email: "family@example.com", role: "MANAGER", status: "PENDING", expiresAt: new Date(Date.now() + 86400000).toISOString() });
  vi.mocked(revokePendingInvitation).mockResolvedValue(true);
  vi.mocked(findInvitationByHash).mockResolvedValue({ id: invitationId, weddingId, email: "family@example.com", emailNormalized: "family@example.com", role: "MANAGER", status: "PENDING", expiresAt: new Date(Date.now() + 86400000) });
});
it("normalizes emails and rejects injected wedding ownership or unsupported roles", () => {
  expect(inviteMemberSchema.parse({ email: " Family@Example.com ", role: "ADMIN" }).email).toBe("family@example.com");
  expect(inviteMemberSchema.safeParse({ email: "x@example.com", role: "MANAGER", weddingId }).success).toBe(false);
  expect(inviteMemberSchema.safeParse({ email: "x@example.com", role: "GUEST" }).success).toBe(false);
});
it("stores only the invitation hash and sends the secret only through email", async () => {
  const result = await inviteMember(owner, { email: " Family@Example.com ", role: "MANAGER" });
  const storedHash = vi.mocked(insertInvitation).mock.calls[0][3];
  const mailed = vi.mocked(sendMemberInvitationEmail).mock.calls[0][0];
  expect(storedHash).toMatch(/^[a-f0-9]{64}$/); expect(mailed.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(storedHash).not.toBe(mailed.token); expect(JSON.stringify(result)).not.toContain(mailed.token);
  expect(vi.mocked(insertInvitation).mock.calls[0][0]).toBe(weddingId);
});
it.each(["invite", "list", "revoke"])("rejects Manager invitation administration: %s", async action => {
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "MANAGER" });
  const work = action === "invite" ? inviteMember(owner, { email: "family@example.com", role: "ADMIN" }) : action === "list" ? listInvitations(owner) : revokeInvitation(owner, invitationId);
  await expect(work).rejects.toMatchObject({ status: 403 }); expect(sendMemberInvitationEmail).not.toHaveBeenCalled();
});
it("allows Managers to read scoped member profiles without exposing user internals", async () => {
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "MANAGER" });
  vi.mocked(listWeddingMemberships).mockResolvedValue([{ membershipId: invitationId, userId: owner, role: "MANAGER", joinedAt: "today" }]);
  vi.mocked(findPublicUsersByIds).mockResolvedValue([{ id: owner, name: "Member", email: "member@example.com" }]);
  expect(await listMembers(owner)).toEqual([{ membershipId: invitationId, role: "MANAGER", joinedAt: "today", user: { id: owner, name: "Member", email: "member@example.com" } }]);
  expect(listWeddingMemberships).toHaveBeenCalledWith(weddingId);
});
it("rejects existing wedding members and duplicate pending invitations", async () => {
  vi.mocked(findUserByEmail).mockResolvedValue({ _id: owner } as never);
  await expect(inviteMember(owner, { email: "family@example.com", role: "MANAGER" })).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
  vi.mocked(findUserByEmail).mockResolvedValue(null); vi.mocked(insertInvitation).mockRejectedValue({ code: 11000 });
  await expect(inviteMember(owner, { email: "family@example.com", role: "MANAGER" })).rejects.toMatchObject({ code: "INVITATION_ALREADY_PENDING" });
});
it("validates email setup before creating a pending record", async () => {
  vi.mocked(getInvitationEmailConfig).mockImplementation(() => { throw new Error("Not configured"); });
  await expect(inviteMember(owner, { email: "family@example.com", role: "MANAGER" })).rejects.toThrow("Not configured");
  expect(insertInvitation).not.toHaveBeenCalled();
});
it("revokes a failed delivery attempt so an Admin can retry", async () => {
  vi.mocked(sendMemberInvitationEmail).mockRejectedValue(new Error("Delivery failed"));
  await expect(inviteMember(owner, { email: "family@example.com", role: "MANAGER" })).rejects.toThrow("Delivery failed");
  expect(revokePendingInvitation).toHaveBeenCalledWith(weddingId, invitationId);
});
it("returns NOT_FOUND for an invitation outside the current wedding", async () => {
  vi.mocked(revokePendingInvitation).mockResolvedValue(false);
  await expect(revokeInvitation(owner, invitationId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(revokePendingInvitation).toHaveBeenCalledWith(weddingId, invitationId);
});
it("rejects malformed ids and tokens before repository access", async () => {
  await expect(revokeInvitation(owner, "invalid")).rejects.toThrow();
  await expect(getPublicInvitation("invalid")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  expect(findInvitationByHash).not.toHaveBeenCalled(); expect(revokePendingInvitation).not.toHaveBeenCalled();
});
it.each([
  ["REVOKED", "INVALID_TOKEN"], ["ACCEPTED", "INVITATION_ALREADY_ACCEPTED"], ["EXPIRED", "TOKEN_EXPIRED"],
])("rejects %s invitations", async (state, code) => {
  vi.mocked(findInvitationByHash).mockResolvedValue({ status: state === "EXPIRED" ? "PENDING" : state, expiresAt: new Date(state === "EXPIRED" ? 0 : Date.now() + 10000) } as never);
  await expect(getPublicInvitation(token)).rejects.toMatchObject({ code });
});
it("returns only minimal public wedding details and accepts with authenticated email", async () => {
  vi.mocked(findWedding).mockResolvedValue({ brideName: "A", groomName: "B", weddingDate: "2027-02-14", id: weddingId, description: "private" } as never);
  expect(await getPublicInvitation(token)).toEqual({ email: "family@example.com", role: "MANAGER", wedding: { brideName: "A", groomName: "B", weddingDate: "2027-02-14" }, requiresLogin: true });
  await acceptInvitation({ id: owner, email: " Family@Example.com " }, token);
  expect(acceptInvitationAtomically).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), owner, "family@example.com");
});
it("rejects missing membership and missing wedding", async () => {
  vi.mocked(findMembership).mockResolvedValue(null);
  await expect(listInvitations(owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "ADMIN" }); vi.mocked(findWedding).mockResolvedValue(null);
  await expect(getPublicInvitation(token)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  expect(listPendingInvitations).not.toHaveBeenCalled();
});
it("validates role changes and scopes member mutations to the actor's wedding", async () => {
  await expect(changeMemberRole(owner, invitationId, { role: "GUEST" })).rejects.toThrow();
  await expect(changeMemberRole(owner, invitationId, { role: "ADMIN", weddingId: "other" })).rejects.toThrow();
  expect(mutateWeddingMember).not.toHaveBeenCalled();
  await changeMemberRole(owner, invitationId, { role: "MANAGER" });
  expect(mutateWeddingMember).toHaveBeenCalledWith(owner, weddingId, invitationId, "MANAGER");
  await removeMember(owner, invitationId);
  expect(mutateWeddingMember).toHaveBeenCalledWith(owner, weddingId, invitationId, null);
});
it("rejects Manager role changes and member removal before mutation", async () => {
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "MANAGER" });
  await expect(changeMemberRole(owner, invitationId, { role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(removeMember(owner, invitationId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(mutateWeddingMember).not.toHaveBeenCalled();
});
