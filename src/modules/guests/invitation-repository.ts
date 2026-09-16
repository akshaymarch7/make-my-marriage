import "server-only";
import { Types } from "mongoose";
import { Guest } from "./guest.model";
import { objectIdSchema } from "@/server/db/object-id";
import { connectToDatabase } from "@/server/db/mongoose";
import { guestInvitationTokenSchema, type RsvpInput, type RsvpSummary } from "./invitation-schemas";
export async function findInvitationSecret(weddingId: string, guestId: string) {
  objectIdSchema.parse(weddingId); objectIdSchema.parse(guestId); await connectToDatabase();
  const row = await Guest.findOne({ weddingId, _id: guestId }).select("invitationToken").lean();
  return row?.invitationToken ?? null;
}
export async function findInvitationOwner(token: string) {
  guestInvitationTokenSchema.parse(token); await connectToDatabase();
  // Token lookup is the authorization boundary; subsequent access uses this owner.
  const row = await Guest.findOne({ invitationToken: token }).select("weddingId name maxGuests invitedEventIds rsvpStatus attendingCount rsvpUpdatedAt __v").lean();
  return row ? { id: row._id.toString(), weddingId: row.weddingId.toString(), name: row.name, maxGuests: row.maxGuests, invitedEventIds: row.invitedEventIds.map(String), rsvpStatus: row.rsvpStatus, attendingCount: row.attendingCount ?? null, updatedAt: row.rsvpUpdatedAt?.toISOString() ?? null, version: row.__v } : null;
}
export async function writeRsvp(owner: NonNullable<Awaited<ReturnType<typeof findInvitationOwner>>>, token: string, input: RsvpInput) {
  objectIdSchema.parse(owner.id); objectIdSchema.parse(owner.weddingId); guestInvitationTokenSchema.parse(token); await connectToDatabase();
  const row = await Guest.findOneAndUpdate({ _id: owner.id, weddingId: owner.weddingId, invitationToken: token, __v: owner.version, ...(input.status === "ATTENDING" ? { maxGuests: { $gte: input.attendingCount } } : {}) }, { $set: { rsvpStatus: input.status, attendingCount: input.attendingCount, rsvpUpdatedAt: new Date() }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true }).select("rsvpStatus attendingCount rsvpUpdatedAt").lean();
  return row ? { status: row.rsvpStatus as RsvpInput["status"], attendingCount: row.attendingCount!, updatedAt: row.rsvpUpdatedAt!.toISOString() } : null;
}
export async function readRsvpSummary(weddingId: string): Promise<RsvpSummary> {
  objectIdSchema.parse(weddingId); await connectToDatabase();
  const rows = await Guest.aggregate<RsvpSummary>([{ $match: { weddingId: new Types.ObjectId(weddingId) } }, { $group: {
    _id: null, totalGuests: { $sum: 1 }, pendingInvitations: { $sum: { $cond: [{ $eq: ["$rsvpStatus", "PENDING"] }, 1, 0] } },
    attendingInvitations: { $sum: { $cond: [{ $eq: ["$rsvpStatus", "ATTENDING"] }, 1, 0] } }, notAttendingInvitations: { $sum: { $cond: [{ $eq: ["$rsvpStatus", "NOT_ATTENDING"] }, 1, 0] } }, totalPeopleAttending: { $sum: { $cond: [{ $eq: ["$rsvpStatus", "ATTENDING"] }, "$attendingCount", 0] } },
  } }, { $project: { _id: 0 } }]);
  return rows[0] ?? { totalGuests: 0, pendingInvitations: 0, attendingInvitations: 0, notAttendingInvitations: 0, totalPeopleAttending: 0 };
}
