import "server-only";
import { requireWeddingMember } from "@/modules/memberships/service";
import { AppError } from "@/server/http/app-error";
import { objectIdSchema } from "@/server/db/object-id";
import { createEventSchema, eventListQuerySchema, updateEventSchema } from "./schemas";
import { findEvents, findEvent, insertEvent, patchEvent, archiveEventRecord } from "./repository";
const missing = () => new AppError({ category: "NOT_FOUND", message: "Event not found." });
async function weddingScope(userId: string) {
  const { member } = await requireWeddingMember(userId);
  if (!["ADMIN", "MANAGER"].includes(member.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot manage wedding events." });
  return member.weddingId;
}
export async function listEvents(userId: string, query: unknown = {}) {
  const parsed = eventListQuerySchema.parse(query);
  return findEvents(await weddingScope(userId), parsed);
}
export async function getEvent(userId: string, eventId: string) {
  objectIdSchema.parse(eventId);
  const found = await findEvent(await weddingScope(userId), eventId);
  if (!found) throw missing();
  return found.event;
}
export async function createEvent(userId: string, input: unknown) {
  const data = createEventSchema.parse(input);
  return insertEvent(await weddingScope(userId), data);
}
export async function updateEvent(userId: string, eventId: string, input: unknown) {
  objectIdSchema.parse(eventId);
  const changes = updateEventSchema.parse(input);
  const weddingId = await weddingScope(userId);
  const found = await findEvent(weddingId, eventId);
  if (!found) throw missing();
  if (found.event.archivedAt) throw new AppError({ category: "CONFLICT", message: "Archived events cannot be edited." });
  const { name, type, startsAt, endsAt, venueName, address, description, dressCode } = found.event;
  const existing = { name, type, startsAt, endsAt, venueName, address, description, dressCode };
  createEventSchema.parse({ ...existing, ...changes });
  const updated = await patchEvent(weddingId, eventId, found.version, changes);
  if (!updated) throw new AppError({ category: "CONFLICT", message: "This event changed while saving. Reload its latest details before trying again." });
  return updated;
}
export async function archiveEvent(userId: string, eventId: string) {
  objectIdSchema.parse(eventId);
  const weddingId = await weddingScope(userId);
  const found = await findEvent(weddingId, eventId);
  if (!found) throw missing();
  if (!found.event.archivedAt) await archiveEventRecord(weddingId, eventId);
  return { success: true };
}
