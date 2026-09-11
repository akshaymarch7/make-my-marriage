// Opt-in: TEST_MEMBERS_DB=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/modules/memberships/invitations.integration.test.ts
// Uses temporary records in the configured database. Email delivery is always mocked.
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createUser } from "@/modules/auth/repository";
import { createWedding } from "@/modules/weddings/service";
import { connectToDatabase } from "@/server/db/mongoose";
import { findMembership } from "./repository";
import { acceptInvitation, changeMemberRole, removeMember, getPublicInvitation, inviteMember, listInvitations, listMembers, revokeInvitation } from "./service";
import { sendMemberInvitationEmail } from "@/server/email/member-invitation";
const mail = vi.hoisted(() => new Map<string, string>());
vi.mock("@/server/email/member-invitation", () => ({ getInvitationEmailConfig: () => ({}), sendMemberInvitationEmail: vi.fn(async (input: { id: string; token: string }) => { mail.set(input.id, input.token); }) }));

describe.skipIf(process.env.TEST_MEMBERS_DB !== "1")("member invitations with real MongoDB transactions and mocked email", () => {
  const run = `members-test-${randomUUID()}`;
  const users: Array<{ id: string; email: string }> = [];
  const weddings: string[] = [];
  let owner: { id: string; email: string }, other: { id: string; email: string };
  async function user(label: string) {
    const row = await createUser({ name: "Invitation Test", email: `${run}-${label}@example.test`, emailNormalized: `${run}-${label}@example.test`, passwordHash: "not-a-login-password" });
    const result = { id: row._id.toString(), email: row.email }; users.push(result); return result;
  }
  beforeAll(async () => {
    owner = await user("owner"); other = await user("other");
    for (const account of [owner, other]) {
      const wedding = await createWedding(account.id, { brideName: "Test Bride", groomName: "Test Groom", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", location: { formattedAddress: "Delhi" } });
      weddings.push(wedding.id);
    }
  }, 30000);
  afterAll(async () => {
    const db = (await connectToDatabase()).connection.db!;
    const ids = users.map(user => new mongoose.Types.ObjectId(user.id));
    const weddingIds = weddings.map(id => new mongoose.Types.ObjectId(id));
    await db.collection("wedding_member_invitations").deleteMany({ weddingId: { $in: weddingIds } });
    await db.collection("wedding_memberships").deleteMany({ userId: { $in: ids } });
    await db.collection("weddings").deleteMany({ _id: { $in: weddingIds } });
    await db.collection("users").deleteMany({ _id: { $in: ids } });
    await mongoose.disconnect();
  }, 30000);
  it("sends one invitation under concurrent creation and isolates wedding reads and revocation", async () => {
    const recipient = await user("duplicate");
    const results = await Promise.allSettled([1, 2].map(() => inviteMember(owner.id, { email: recipient.email.toUpperCase(), role: "MANAGER" })));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const invitation = (await listInvitations(owner.id)).find(row => row.email === recipient.email)!;
    expect(await listInvitations(other.id)).toHaveLength(0);
    await expect(revokeInvitation(other.id, invitation.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const token = mail.get(invitation.id)!;
    expect(await getPublicInvitation(token)).toMatchObject({ email: recipient.email, role: "MANAGER" });
    expect(JSON.stringify(await listInvitations(owner.id))).not.toContain(token);
    await expect(acceptInvitation(other, token)).rejects.toMatchObject({ code: "INVITATION_EMAIL_MISMATCH" });
    await revokeInvitation(owner.id, invitation.id);
    await expect(acceptInvitation(recipient, token)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    expect(await findMembership(recipient.id)).toBeNull();
  }, 30000);
  it("accepts only once and enforces Manager administration restrictions", async () => {
    const recipient = await user("manager");
    const invitation = await inviteMember(owner.id, { email: recipient.email, role: "MANAGER" });
    const token = mail.get(invitation.id)!;
    const results = await Promise.allSettled([1, 2].map(() => acceptInvitation(recipient, token)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await findMembership(recipient.id)).toEqual({ weddingId: weddings[0], role: "MANAGER" });
    expect((await listMembers(recipient.id)).some(member => member.user.id === recipient.id)).toBe(true);
    await expect(listInvitations(recipient.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(inviteMember(recipient.id, { email: "blocked@example.test", role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(inviteMember(owner.id, { email: recipient.email, role: "ADMIN" })).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
    await expect(getPublicInvitation(token)).rejects.toMatchObject({ code: "INVITATION_ALREADY_ACCEPTED" });
  }, 30000);
  it("cannot create memberships in two weddings through concurrent acceptance", async () => {
    const recipient = await user("two-weddings");
    const invitations = await Promise.all([owner, other].map(admin => inviteMember(admin.id, { email: recipient.email, role: "ADMIN" })));
    const results = await Promise.allSettled(invitations.map(invitation => acceptInvitation(recipient, mail.get(invitation.id)!)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "ALREADY_HAS_WEDDING" });
    expect((await findMembership(recipient.id))?.role).toBe("ADMIN");
    const db = (await connectToDatabase()).connection.db!;
    expect(await db.collection("wedding_memberships").countDocuments({ userId: new mongoose.Types.ObjectId(recipient.id) })).toBe(1);
    expect(await db.collection("wedding_member_invitations").countDocuments({ emailNormalized: recipient.email, status: "ACCEPTED" })).toBe(1);
  }, 30000);
  it("rejects expiry immediately and permits a replacement invitation", async () => {
    const recipient = await user("expiry");
    const invitation = await inviteMember(owner.id, { email: recipient.email, role: "MANAGER" });
    const db = (await connectToDatabase()).connection.db!;
    await db.collection("wedding_member_invitations").updateOne({ _id: new mongoose.Types.ObjectId(invitation.id) }, { $set: { expiresAt: new Date(0) } });
    await expect(acceptInvitation(recipient, mail.get(invitation.id)!)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
    expect((await listInvitations(owner.id)).some(row => row.id === invitation.id)).toBe(false);
    const replacement = await inviteMember(owner.id, { email: recipient.email, role: "MANAGER" });
    expect(replacement.id).not.toBe(invitation.id);
    await expect(getPublicInvitation(mail.get(invitation.id)!)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    await expect(getPublicInvitation(mail.get(replacement.id)!)).resolves.toMatchObject({ email: recipient.email });
  }, 30000);
  it("revokes failed email attempts and permits retry", async () => {
    const recipient = await user("delivery");
    vi.mocked(sendMemberInvitationEmail).mockRejectedValueOnce(new Error("Simulated email failure"));
    await expect(inviteMember(owner.id, { email: recipient.email, role: "MANAGER" })).rejects.toThrow("Simulated email failure");
    expect((await listInvitations(owner.id)).some(row => row.email === recipient.email)).toBe(false);
    await expect(inviteMember(owner.id, { email: recipient.email, role: "MANAGER" })).resolves.toMatchObject({ status: "PENDING" });
  }, 30000);

  async function managedWedding(label: string) {
    const admin = await user(`${label}-admin`), colleague = await user(`${label}-colleague`);
    const wedding = await createWedding(admin.id, { brideName: "Manage", groomName: "Members", weddingDate: "2027-02-14", location: { formattedAddress: "Delhi" } }); weddings.push(wedding.id);
    const invitation = await inviteMember(admin.id, { email: colleague.email, role: "MANAGER" });
    await acceptInvitation(colleague, mail.get(invitation.id)!);
    const members = await listMembers(admin.id);
    return { admin, colleague, weddingId: wedding.id, adminId: members.find(row => row.user.id === admin.id)!.membershipId, colleagueId: members.find(row => row.user.id === colleague.id)!.membershipId };
  }
  it("changes roles, protects the last Admin, scopes targets, and removes wedding access", async () => {
    const fixture = await managedWedding("management");
    await expect(removeMember(fixture.admin.id, fixture.adminId)).rejects.toMatchObject({ code: "LAST_ADMIN" });
    await expect(changeMemberRole(fixture.admin.id, fixture.adminId, { role: "MANAGER" })).rejects.toMatchObject({ code: "LAST_ADMIN" });
    await expect(changeMemberRole(owner.id, fixture.colleagueId, { role: "ADMIN" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeMember(owner.id, fixture.colleagueId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeMember(fixture.colleague.id, fixture.adminId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await changeMemberRole(fixture.admin.id, fixture.colleagueId, { role: "ADMIN" });
    expect((await findMembership(fixture.colleague.id))?.role).toBe("ADMIN");
    await changeMemberRole(fixture.admin.id, fixture.adminId, { role: "MANAGER" });
    await expect(listInvitations(fixture.admin.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await removeMember(fixture.colleague.id, fixture.adminId);
    expect(await findMembership(fixture.admin.id)).toBeNull();
    await expect(listMembers(fixture.admin.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listMembers(fixture.colleague.id))).toHaveLength(1);
  }, 30000);
  it.each(["demote", "remove", "mutual-demote"])("preserves an Admin under concurrent %s requests", async operation => {
    const fixture = await managedWedding(operation);
    await changeMemberRole(fixture.admin.id, fixture.colleagueId, { role: "ADMIN" });
    const work = operation === "remove"
      ? [removeMember(fixture.admin.id, fixture.adminId), removeMember(fixture.colleague.id, fixture.colleagueId)]
      : operation === "mutual-demote"
        ? [changeMemberRole(fixture.admin.id, fixture.colleagueId, { role: "MANAGER" }), changeMemberRole(fixture.colleague.id, fixture.adminId, { role: "MANAGER" })]
        : [changeMemberRole(fixture.admin.id, fixture.adminId, { role: "MANAGER" }), changeMemberRole(fixture.colleague.id, fixture.colleagueId, { role: "MANAGER" })];
    const results = await Promise.allSettled(work);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason.code).toBe(operation === "mutual-demote" ? "FORBIDDEN" : "LAST_ADMIN");
    const db = (await connectToDatabase()).connection.db!;
    expect(await db.collection("wedding_memberships").countDocuments({ weddingId: new mongoose.Types.ObjectId(fixture.weddingId), role: "ADMIN" })).toBe(1);
  }, 30000);
});
