import { z } from "zod";
export const eventTypes = ["ROKA", "ENGAGEMENT", "MEHENDI", "HALDI", "SANGEET", "COCKTAIL", "WEDDING", "RECEPTION", "CUSTOM"] as const;
const text = (max: number) => z.string().trim().max(max, `Use no more than ${max} characters.`).optional();
const timestamp = z.iso.datetime({ offset: true, message: "Choose a valid date and time." });
const fields = z.object({
  name: z.string().trim().min(1, "Enter an event name.").max(150, "Use no more than 150 characters."),
  type: z.enum(eventTypes).optional(), startsAt: timestamp, endsAt: timestamp.nullable().optional(),
  venueName: text(200), address: text(500), description: text(2000), dressCode: text(200),
}).strict();
export const createEventSchema = fields.refine(value => !value.endsAt || Date.parse(value.endsAt) > Date.parse(value.startsAt), { path: ["endsAt"], message: "End time must be after the start time." });
export const updateEventSchema = fields.partial().refine(value => Object.keys(value).length > 0, "Provide at least one change.");
export const eventListQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional().transform(value => value === "true"),
  from: timestamp.optional(), to: timestamp.optional(),
}).strict().refine(value => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to), { path: ["to"], message: "The end of the range must follow its start." });
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type WeddingEvent = {
  id: string; name: string; type?: typeof eventTypes[number]; startsAt: string; endsAt: string | null;
  venueName: string; address: string; description: string; dressCode: string; archivedAt: string | null;
};
