import "server-only";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { MemberInvitation } from "./invitation.model";
import { Membership } from "./membership.model";
import type { InviteMemberInput } from "./schemas";

export const invitationUnavailable = () => new AppError({ category: "INVALID_TOKEN", message: "This invitation is invalid or has been revoked. Ask the wedding Admin for a new invitation." });
export function assertInvitationActive(invitation: { status: string; expiresAt: Date } | null) {
  if (!invitation || invitation.status === "REVOKED") throw invitationUnavailable();
  if (invitation.status === "ACCEPTED") throw new AppError({ category: "CONFLICT", code: "INVITATION_ALREADY_ACCEPTED", message: "This invitation has already been accepted." });
  if (invitation.expiresAt.getTime() <= Date.now()) throw new AppError({ category: "TOKEN_EXPIRED", message: "This invitation has expired. Ask the wedding Admin for a new invitation." });
}
export async function insertInvitation(weddingId: string, userId: string, input: InviteMemberInput, tokenHash: string, expiresAt: Date) {
  objectIdSchema.parse(weddingId); objectIdSchema.parse(userId);
  await connectToDatabase(); await MemberInvitation.init();
  // Release the partial unique index before issuing a replacement for an expired link.
  await MemberInvitation.updateMany({ weddingId, emailNormalized: input.email, status: "PENDING", expiresAt: { $lte: new Date() } }, { $set: { status: "REVOKED" } });
  const invitation = await MemberInvitation.create({ weddingId, invitedByUserId: userId, ...input, emailNormalized: input.email, tokenHash, expiresAt });
  return { id: invitation._id.toString(), email: invitation.email, role: invitation.role, status: invitation.status, expiresAt: invitation.expiresAt.toISOString() };
}
export async function listPendingInvitations(weddingId: string) {
  objectIdSchema.parse(weddingId); await connectToDatabase();
  const rows = await MemberInvitation.find({ weddingId, status: "PENDING", expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean();
  return rows.map(row => ({ id: row._id.toString(), email: row.email, role: row.role, status: row.status, expiresAt: row.expiresAt.toISOString() }));
}
export async function revokePendingInvitation(weddingId: string, id: string) {
  objectIdSchema.parse(weddingId); objectIdSchema.parse(id); await connectToDatabase();
  const result = await MemberInvitation.updateOne({ _id: id, weddingId, status: "PENDING" }, { $set: { status: "REVOKED" } });
  return result.modifiedCount > 0;
}
export async function findInvitationByHash(tokenHash: string) {
  await connectToDatabase();
  const row = await MemberInvitation.findOne({ tokenHash }).lean();
  return row ? { id: row._id.toString(), weddingId: row.weddingId.toString(), email: row.email, emailNormalized: row.emailNormalized, role: row.role, status: row.status, expiresAt: row.expiresAt } : null;
}
export async function acceptInvitationAtomically(tokenHash: string, userId: string, email: string) {
  objectIdSchema.parse(userId);
  const connection = await connectToDatabase(); await Membership.init(); await MemberInvitation.init();
  try {
    return await connection.connection.transaction(async session => {
      const invitation = await MemberInvitation.findOne({ tokenHash }).session(session).lean();
      assertInvitationActive(invitation);
      if (!invitation) throw invitationUnavailable();
      if (invitation.emailNormalized !== email) throw new AppError({ category: "FORBIDDEN", code: "INVITATION_EMAIL_MISMATCH", message: "Sign in with the email address this invitation was sent to." });
      if (await Membership.exists({ userId }).session(session)) throw new AppError({ category: "CONFLICT", code: "ALREADY_HAS_WEDDING", message: "Your account already belongs to a wedding." });
      const updated = await MemberInvitation.updateOne({ _id: invitation._id, weddingId: invitation.weddingId, status: "PENDING", expiresAt: { $gt: new Date() } }, { $set: { status: "ACCEPTED", acceptedByUserId: userId, acceptedAt: new Date() } }, { session });
      if (!updated.modifiedCount) throw invitationUnavailable();
      await Membership.create([{ userId, weddingId: invitation.weddingId, role: invitation.role }], { session });
      return { weddingId: invitation.weddingId.toString(), role: invitation.role };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new AppError({ category: "CONFLICT", code: "ALREADY_HAS_WEDDING", message: "Your account already belongs to a wedding." });
    throw error;
  }
}
