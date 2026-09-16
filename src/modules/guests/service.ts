import "server-only";
import { requireWeddingMember } from "@/modules/memberships/service";
import { findEvents } from "@/modules/events/repository";
import { generateSecureToken } from "@/server/auth/tokens";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { createGuestSchema, updateGuestSchema, guestQuerySchema, type GuestEvent, type GuestRecord, type GuestView } from "./schemas";
import { findGuests, findGuest, insertGuest, patchGuest, deleteGuestRecord, guestSummary } from "./repository";
const missing = () => new AppError({ category: "NOT_FOUND", message: "Guest not found." });
async function guestScope(userId: string) {
  const { member } = await requireWeddingMember(userId);
  if (!["ADMIN", "MANAGER"].includes(member.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot manage wedding guests." });
  return member.weddingId;
}
async function options(weddingId: string): Promise<GuestEvent[]> {
  return (await findEvents(weddingId, { includeArchived: true })).map(({ id, name, startsAt, archivedAt }) => ({ id, name, startsAt, archivedAt }));
}
export async function getGuestEvents(userId: string) { return options(await guestScope(userId)); }
function decorate(guest: GuestRecord, events: GuestEvent[]): GuestView {
  return { ...guest, invitedEvents: guest.invitedEventIds.flatMap(id => { const event = events.find(event => event.id === id); return event ? [event] : []; }) };
}
function validateEvents(ids: string[] | undefined, events: GuestEvent[], previous: string[] = []) {
  for (const id of ids ?? []) {
    if (previous.includes(id)) continue;
    const event = events.find(event => event.id === id);
    if (!event) throw new AppError({ category: "NOT_FOUND", message: "An invited event was not found.", details: { invitedEventIds: "Choose events from this wedding." } });
    if (event.archivedAt) throw new AppError({ category: "VALIDATION_ERROR", message: "Choose active events.", details: { invitedEventIds: "Archived events cannot be newly selected." } });
  }
}
export async function listGuests(userId: string, input: unknown = {}) {
  const query = guestQuerySchema.parse(input), weddingId = await guestScope(userId);
  const [result, events] = await Promise.all([findGuests(weddingId, query), options(weddingId)]);
  return { data: result.rows.map(guest => decorate(guest, events)), pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) } };
}
export async function getGuest(userId: string, guestId: string) {
  objectIdSchema.parse(guestId); const weddingId = await guestScope(userId);
  const found = await findGuest(weddingId, guestId); if (!found) throw missing();
  return decorate(found.guest, await options(weddingId));
}
export async function createGuest(userId: string, input: unknown) {
  const data = createGuestSchema.parse(input), weddingId = await guestScope(userId), events = await options(weddingId);
  validateEvents(data.invitedEventIds, events);
  return decorate(await insertGuest(weddingId, data, generateSecureToken()), events);
}
export async function updateGuest(userId: string, guestId: string, input: unknown) {
  objectIdSchema.parse(guestId); const changes = updateGuestSchema.parse(input), weddingId = await guestScope(userId);
  const found = await findGuest(weddingId, guestId); if (!found) throw missing();
  if (changes.maxGuests !== undefined && found.guest.attendingCount !== null && changes.maxGuests < found.guest.attendingCount) throw new AppError({ category: "VALIDATION_ERROR", message: "Maximum party size cannot be lower than the number already attending.", details: { maxGuests: "Maximum party size cannot be lower than the number already attending." } });
  const events = await options(weddingId); validateEvents(changes.invitedEventIds, events, found.guest.invitedEventIds);
  const updated = await patchGuest(weddingId, guestId, found.version, changes);
  if (!updated) throw new AppError({ category: "CONFLICT", message: "This guest changed while saving. Reload the latest details before trying again." });
  return decorate(updated, events);
}
export async function deleteGuest(userId: string, guestId: string) {
  objectIdSchema.parse(guestId); if (!await deleteGuestRecord(await guestScope(userId), guestId)) throw missing();
  return { success: true };
}
export async function getGuestSummary(userId: string) { return guestSummary(await guestScope(userId)); }
