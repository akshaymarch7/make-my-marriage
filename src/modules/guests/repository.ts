import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import { Guest, type GuestRow } from "./guest.model";
import type { CreateGuestInput, UpdateGuestInput, GuestRecord, GuestQuery, GuestSummary } from "./schemas";
const publicFields = "name email phone maxGuests invitedEventIds notes rsvpStatus attendingCount invitationSentAt lastReminderSentAt __v";
function project(row: GuestRow & { _id: Types.ObjectId }): GuestRecord {
  return { id: row._id.toString(), name: row.name, email: row.email, phone: row.phone, maxGuests: row.maxGuests, invitedEventIds: row.invitedEventIds.map(String), notes: row.notes, rsvpStatus: row.rsvpStatus, attendingCount: row.attendingCount ?? null, invitationSentAt: row.invitationSentAt?.toISOString() ?? null, lastReminderSentAt: row.lastReminderSentAt?.toISOString() ?? null };
}
async function scope(weddingId: string, guestId?: string) {
  objectIdSchema.parse(weddingId); if (guestId !== undefined) objectIdSchema.parse(guestId);
  await connectToDatabase(); return { weddingId, ...(guestId ? { _id: guestId } : {}) };
}
export async function findGuests(weddingId: string, query: GuestQuery) {
  const pattern = query.search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = { ...await scope(weddingId), ...(query.rsvpStatus ? { rsvpStatus: query.rsvpStatus } : {}), ...(query.eventId ? { invitedEventIds: objectIdSchema.parse(query.eventId) } : {}), ...(query.invitationSent === undefined ? {} : { invitationSentAt: query.invitationSent ? { $ne: null } : null }), ...(pattern ? { $or: ["name", "email", "phone"].map(field => ({ [field]: { $regex: pattern, $options: "i" } })) } : {}) };
  const [rows, total] = await Promise.all([Guest.find(filter).select(publicFields).sort({ name: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), Guest.countDocuments(filter)]);
  return { rows: rows.map(project), total };
}
export async function findGuest(weddingId: string, guestId: string) {
  const row = await Guest.findOne(await scope(weddingId, guestId)).select(publicFields).lean();
  return row ? { guest: project(row), version: row.__v } : null;
}
export async function insertGuest(weddingId: string, input: CreateGuestInput, invitationToken: string) {
  await scope(weddingId);
  return project(await Guest.create({ ...input, weddingId, emailNormalized: input.email?.toLowerCase() ?? "", invitationToken }));
}
export async function patchGuest(weddingId: string, guestId: string, version: number, input: UpdateGuestInput) {
  // Guard capacity even if a future RSVP writer has not incremented __v.
  const capacityGuard = input.maxGuests === undefined ? {} : { $or: [{ attendingCount: null }, { attendingCount: { $lte: input.maxGuests } }] };
  const row = await Guest.findOneAndUpdate({ ...await scope(weddingId, guestId), __v: version, ...capacityGuard }, { $set: { ...input, ...(input.email !== undefined ? { emailNormalized: input.email.toLowerCase() } : {}) }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true }).select(publicFields).lean();
  return row ? project(row) : null;
}
export async function deleteGuestRecord(weddingId: string, guestId: string) {
  // Guest email jobs are not implemented yet; deleting the owner invalidates its token.
  return (await Guest.deleteOne(await scope(weddingId, guestId))).deletedCount > 0;
}
export async function guestSummary(weddingId: string): Promise<GuestSummary> {
  await scope(weddingId);
  const rows = await Guest.aggregate<GuestSummary>([{ $match: { weddingId: new Types.ObjectId(weddingId) } }, { $group: { _id: null, groups: { $sum: 1 }, capacity: { $sum: "$maxGuests" } } }, { $project: { _id: 0, groups: 1, capacity: 1 } }]);
  return rows[0] ?? { groups: 0, capacity: 0 };
}
