import "server-only";
import { getAuthEnv } from "@/config/env";
import { findPublicUsersByIds, findUserByEmail } from "@/modules/auth/repository";
import { findWedding } from "@/modules/weddings/repository";
import { generateSecureToken, hashToken } from "@/server/auth/tokens";
import { objectIdSchema } from "@/server/db/object-id";
import { getInvitationEmailConfig, sendMemberInvitationEmail } from "@/server/email/member-invitation";
import { AppError } from "@/server/http/app-error";
import { findMembership, listWeddingMemberships, mutateWeddingMember } from "./repository";
import { acceptInvitationAtomically, assertInvitationActive, findInvitationByHash, insertInvitation, invitationUnavailable, listPendingInvitations, revokePendingInvitation } from "./invitation-repository";
import { changeMemberRoleSchema, invitationTokenSchema, inviteMemberSchema } from "./schemas";

export async function requireWeddingMember(userId: string, adminOnly = false) {
  objectIdSchema.parse(userId);
  const member = await findMembership(userId);
  if (!member) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  if (adminOnly && member.role !== "ADMIN") throw new AppError({ category: "FORBIDDEN", message: "Only an Admin can manage wedding members and invitations." });
  const wedding = await findWedding(member.weddingId);
  if (!wedding) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  return { member, wedding };
}
export async function listMembers(userId: string) {
  const { member } = await requireWeddingMember(userId);
  const rows = await listWeddingMemberships(member.weddingId);
  const users = new Map((await findPublicUsersByIds(rows.map(row => row.userId))).map(user => [user.id, user]));
  return rows.flatMap(({ userId: id, ...row }) => { const user = users.get(id); return user ? [{ ...row, user }] : []; });
}
export async function listInvitations(userId: string) {
  const { member } = await requireWeddingMember(userId, true);
  return listPendingInvitations(member.weddingId);
}
export async function inviteMember(userId: string, input: unknown) {
  const { member, wedding } = await requireWeddingMember(userId, true);
  const data = inviteMemberSchema.parse(input);
  const user = await findUserByEmail(data.email);
  if (user) {
    const existing = await findMembership(user._id.toString());
    if (existing?.weddingId === member.weddingId) throw new AppError({ category: "CONFLICT", code: "ALREADY_MEMBER", message: "This person is already a member of your wedding." });
  }
  getInvitationEmailConfig();
  const token = generateSecureToken();
  let invitation;
  try {
    invitation = await insertInvitation(member.weddingId, userId, data, hashToken(token, getAuthEnv().AUTH_TOKEN_PEPPER), new Date(Date.now() + 7 * 86400000));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new AppError({ category: "CONFLICT", code: "INVITATION_ALREADY_PENDING", message: "A pending invitation already exists for this email." });
    throw error;
  }
  try { await sendMemberInvitationEmail({ ...invitation, token, brideName: wedding.brideName, groomName: wedding.groomName }); }
  catch (error) { await revokePendingInvitation(member.weddingId, invitation.id); throw error; }
  return invitation;
}
export async function revokeInvitation(userId: string, id: string) {
  objectIdSchema.parse(id);
  const { member } = await requireWeddingMember(userId, true);
  if (!await revokePendingInvitation(member.weddingId, id)) throw new AppError({ category: "NOT_FOUND", message: "This pending invitation could not be found. Refresh the list and try again." });
}
function tokenHash(token: string) {
  if (!invitationTokenSchema.safeParse(token).success) throw invitationUnavailable();
  return hashToken(token, getAuthEnv().AUTH_TOKEN_PEPPER);
}
export async function getPublicInvitation(token: string) {
  const invitation = await findInvitationByHash(tokenHash(token));
  assertInvitationActive(invitation);
  if (!invitation) throw invitationUnavailable();
  const wedding = await findWedding(invitation.weddingId);
  if (!wedding) throw invitationUnavailable();
  return { email: invitation.email, role: invitation.role, wedding: { brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate }, requiresLogin: true };
}
export async function acceptInvitation(user: { id: string; email: string }, token: string) {
  // Verify the linked wedding exists before the atomic membership write.
  await getPublicInvitation(token);
  return acceptInvitationAtomically(tokenHash(token), user.id, user.email.trim().toLowerCase());
}

export async function changeMemberRole(userId: string, membershipId: string, input: unknown) {
  objectIdSchema.parse(membershipId);
  const { role } = changeMemberRoleSchema.parse(input);
  const { member } = await requireWeddingMember(userId, true);
  return mutateWeddingMember(userId, member.weddingId, membershipId, role);
}
export async function removeMember(userId: string, membershipId: string) {
  objectIdSchema.parse(membershipId);
  const { member } = await requireWeddingMember(userId, true);
  await mutateWeddingMember(userId, member.weddingId, membershipId, null);
}
