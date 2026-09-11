import { z } from "zod";

const name = z.string().trim().min(1, "Enter a name.").max(100, "Use no more than 100 characters.");
const optionalText = (max: number) => z.string().trim().max(max, `Use no more than ${max} characters.`).optional();
export const timeZoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return value.length > 0; }
  catch { return false; }
}, "Choose a valid time zone.");

export const createWeddingSchema = z.object({
  brideName: name,
  groomName: name,
  title: optionalText(220),
  description: optionalText(1000),
  weddingDate: z.iso.date("Choose a valid wedding date."),
  timeZone: timeZoneSchema.default("Asia/Kolkata"),
  location: z.object({
    formattedAddress: optionalText(300),
    city: optionalText(100),
    state: optionalText(100),
    country: optionalText(100),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googlePlaceId: optionalText(300),
  }).strict().refine(value => Boolean(value.formattedAddress || value.city), {
    message: "Enter your wedding city or location.", path: ["formattedAddress"],
  }),
}).strict();

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;

export const updateWeddingSchema = createWeddingSchema.extend({
  timeZone: timeZoneSchema,
  location: z.object({
    formattedAddress: optionalText(300), city: optionalText(100), state: optionalText(100), country: optionalText(100),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    googlePlaceId: optionalText(300),
  }).strict().refine(value => Object.keys(value).length > 0, "Provide a location change."),
}).partial().refine(value => Object.keys(value).length > 0, "Provide at least one change.");
export type UpdateWeddingInput = z.infer<typeof updateWeddingSchema>;
