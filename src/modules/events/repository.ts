import "server-only";
import { Event, type EventRow } from "./event.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import type { CreateEventInput, EventListQuery, UpdateEventInput, WeddingEvent } from "./schemas";
import type { Types } from "mongoose";
function project(row: EventRow & { _id: Types.ObjectId }): WeddingEvent {
  return { id: row._id.toString(), name: row.name, type: row.type ?? undefined, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt?.toISOString() ?? null, venueName: row.venueName, address: row.address, description: row.description, dressCode: row.dressCode, archivedAt: row.archivedAt?.toISOString() ?? null };
}
async function scoped(weddingId: string, eventId?: string) {
  objectIdSchema.parse(weddingId); if (eventId !== undefined) objectIdSchema.parse(eventId);
  await connectToDatabase();
  return { weddingId, ...(eventId ? { _id: eventId } : {}) };
}
export async function findEvents(weddingId: string, query: EventListQuery) {
  const scope = await scoped(weddingId);
  const rows = await Event.find({ ...scope, ...(!query.includeArchived ? { archivedAt: null } : {}), ...((query.from || query.to) ? { startsAt: { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) } } : {}) }).sort({ startsAt: 1, _id: 1 }).lean();
  return rows.map(project);
}
export async function findEvent(weddingId: string, eventId: string) {
  const row = await Event.findOne(await scoped(weddingId, eventId)).lean();
  return row ? { event: project(row), version: row.__v } : null;
}
export async function insertEvent(weddingId: string, input: CreateEventInput) {
  await scoped(weddingId);
  return project(await Event.create({ ...input, weddingId }));
}
export async function patchEvent(weddingId: string, eventId: string, version: number, input: UpdateEventInput) {
  const row = await Event.findOneAndUpdate({ ...await scoped(weddingId, eventId), archivedAt: null, __v: version }, { $set: input, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true }).lean();
  return row ? project(row) : null;
}
export async function archiveEventRecord(weddingId: string, eventId: string) {
  const row = await Event.findOneAndUpdate({ ...await scoped(weddingId, eventId), archivedAt: null }, { $set: { archivedAt: new Date() }, $inc: { __v: 1 } }, { returnDocument: "after" }).lean();
  return row ? project(row) : null;
}

/** Public invitations can load only the token owner's selected, active events. */
export async function findInvitedEvents(weddingId: string, eventIds: string[]) {
  eventIds.forEach(id => objectIdSchema.parse(id));
  const filter = await scoped(weddingId);
  if (!eventIds.length) return [];
  return (await Event.find({ ...filter, _id: { $in: eventIds }, archivedAt: null }).sort({ startsAt: 1, _id: 1 }).lean()).map(project);
}
