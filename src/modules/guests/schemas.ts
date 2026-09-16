import { z } from "zod";
import { objectIdSchema } from "@/server/db/object-id";
export const rsvpStatuses = ["PENDING", "ATTENDING", "NOT_ATTENDING"] as const;
export const rsvpLabels = { PENDING: "Pending", ATTENDING: "Attending", NOT_ATTENDING: "Not attending" };
const id = objectIdSchema.transform(value => value.toLowerCase());
const fields = z.object({
  name: z.string().trim().min(1, "Enter the guest’s name.").max(120, "Use no more than 120 characters."),
  email: z.string().trim().pipe(z.union([z.email({ message: "Enter a valid email address." }).max(254), z.literal("")])).optional(),
  phone: z.string().trim().max(40, "Use no more than 40 characters.").refine(value => !value || /^[+\d\s().-]+$/.test(value) && /\d/.test(value), "Enter a valid phone number.").optional(),
  maxGuests: z.number({ error: "Enter a whole number of people." }).int("Enter a whole number of people.").min(1, "Include at least the named guest.").max(10000, "Use no more than 10,000 people."),
  invitedEventIds: z.array(id).max(100, "Choose no more than 100 events.").refine(ids => new Set(ids).size === ids.length, "Choose each event only once."),
  notes: z.string().trim().max(2000, "Use no more than 2000 characters.").optional(),
}).strict();
export const createGuestSchema = fields.extend({ maxGuests: fields.shape.maxGuests.default(1), invitedEventIds: fields.shape.invitedEventIds.default([]) });
export const updateGuestSchema = fields.partial().refine(value => Object.keys(value).length > 0, "Provide at least one change.");
export const guestQuerySchema = z.object({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100000)).optional().default(1),
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional().default(20),
  search: z.string().trim().max(120).optional(), rsvpStatus: z.enum(rsvpStatuses).optional(), eventId: id.optional(),
  invitationSent: z.enum(["true", "false"]).optional().transform(value => value === undefined ? undefined : value === "true"),
}).strict();
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type GuestQuery = z.infer<typeof guestQuerySchema>;
export type GuestRecord = { id: string; name: string; email: string; phone: string; maxGuests: number; invitedEventIds: string[]; notes: string; rsvpStatus: typeof rsvpStatuses[number]; attendingCount: number | null; invitationSentAt: string | null; lastReminderSentAt: string | null };
export type GuestEvent = { id: string; name: string; startsAt: string; archivedAt: string | null };
export type GuestView = GuestRecord & { invitedEvents: GuestEvent[] };
export type GuestListResult = { data: GuestView[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type GuestSummary = { groups: number; capacity: number };
export function attendanceLabel(guest: Pick<GuestRecord, "rsvpStatus" | "attendingCount">) {
  return guest.rsvpStatus === "PENDING" ? "Awaiting response" : guest.rsvpStatus === "NOT_ATTENDING" ? "0 people" : guest.attendingCount === null ? "Not recorded" : `${guest.attendingCount} ${guest.attendingCount === 1 ? "person" : "people"}`;
}
