import { z } from "zod";
export const guestInvitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "This invitation is unavailable.");
export const rsvpInputSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ATTENDING"), attendingCount: z.number().int("Choose a whole number of people.").min(1, "Include at least one person.").max(10000) }).strict(),
  z.object({ status: z.literal("NOT_ATTENDING"), attendingCount: z.literal(0) }).strict(),
]);
export const rsvpResultSchema = z.object({ status: z.enum(["ATTENDING", "NOT_ATTENDING"]), attendingCount: z.number().int().min(0), updatedAt: z.iso.datetime().nullable() });
export type RsvpInput = z.infer<typeof rsvpInputSchema>;
export type PublicInvitation = {
  guest: { name: string; maxGuests: number; rsvpStatus: "PENDING" | "ATTENDING" | "NOT_ATTENDING"; attendingCount: number | null };
  wedding: { brideName: string; groomName: string; weddingDate: string; timeZone: string; title: string; location: string };
  events: { name: string; startsAt: string; endsAt: string | null; venueName: string; address: string; dressCode: string; description: string }[];
};
export type RsvpSummary = { totalGuests: number; pendingInvitations: number; attendingInvitations: number; notAttendingInvitations: number; totalPeopleAttending: number };
