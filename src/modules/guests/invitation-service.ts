import "server-only";
import { requireWeddingMember } from "@/modules/memberships/service";
import { findWedding } from "@/modules/weddings/repository";
import { findInvitedEvents } from "@/modules/events/repository";
import { objectIdSchema } from "@/server/db/object-id";
import { limitGuestRsvp } from "@/server/auth/rate-limit";
import { AppError } from "@/server/http/app-error";
import { findInvitationSecret, findInvitationOwner, writeRsvp, readRsvpSummary } from "./invitation-repository";
import { guestInvitationTokenSchema, rsvpInputSchema, type PublicInvitation } from "./invitation-schemas";
const unavailable = () => new AppError({ category: "NOT_FOUND", message: "This invitation is unavailable." });
async function scope(userId: string) {
  const { member } = await requireWeddingMember(userId);
  if (!["ADMIN", "MANAGER"].includes(member.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot manage guest invitations." });
  return member.weddingId;
}
export async function getGuestInvitationLink(userId: string, guestId: string) {
  objectIdSchema.parse(guestId);
  const token = await findInvitationSecret(await scope(userId), guestId);
  if (!token || !guestInvitationTokenSchema.safeParse(token).success) throw unavailable();
  // Use the configured public origin, never an untrusted Host header.
  let origin: URL;
  try { origin = new URL(process.env.NEXT_PUBLIC_APP_URL!); if (!["https:", "http:"].includes(origin.protocol)) throw new Error(); }
  catch { throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Invitation sharing is not configured yet." }); }
  return { url: new URL(`/invite/${token}`, origin.origin).toString() };
}
async function resolve(token: string) {
  if (!guestInvitationTokenSchema.safeParse(token).success) throw unavailable();
  const owner = await findInvitationOwner(token); if (!owner) throw unavailable();
  const wedding = await findWedding(owner.weddingId); if (!wedding) throw unavailable();
  return { owner, wedding };
}
export async function getPublicGuestInvitation(token: string): Promise<PublicInvitation> {
  const { owner, wedding } = await resolve(token);
  const events = await findInvitedEvents(owner.weddingId, owner.invitedEventIds);
  return {
    guest: { name: owner.name, maxGuests: owner.maxGuests, rsvpStatus: owner.rsvpStatus, attendingCount: owner.attendingCount },
    wedding: { brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, timeZone: wedding.timeZone, title: wedding.title, location: [wedding.location.city, wedding.location.state, wedding.location.country].filter(Boolean).join(", ") },
    events: events.map(({ name, startsAt, endsAt, venueName, address, dressCode, description }) => ({ name, startsAt, endsAt, venueName, address, dressCode, description })),
  };
}
export async function submitGuestRsvp(token: string, value: unknown) {
  const input = rsvpInputSchema.parse(value), { owner } = await resolve(token);
  if (input.status === "ATTENDING" && input.attendingCount > owner.maxGuests) throw new AppError({ category: "VALIDATION_ERROR", code: "PARTY_SIZE_CHANGED", message: `Your invitation allows up to ${owner.maxGuests} ${owner.maxGuests === 1 ? "person" : "people"}. Please update your headcount.`, details: { attendingCount: `Choose between 1 and ${owner.maxGuests}.` } });
  await limitGuestRsvp(token);
  if (owner.rsvpStatus === input.status && owner.attendingCount === input.attendingCount) return { ...input, updatedAt: owner.updatedAt };
  const result = await writeRsvp(owner, token, input);
  if (!result) throw new AppError({ category: "CONFLICT", message: "Your invitation changed while saving. Please review the latest details and try again." });
  return result;
}
export async function getRsvpSummary(userId: string) { return readRsvpSummary(await scope(userId)); }
