import { z } from "zod";
import { objectIdSchema } from "@/server/db/object-id";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const photoInput = z.object({ filename: z.string().trim().min(1).max(255).regex(/^[^\x00-\x1f\x7f/\\]+$/, "Choose a file with a valid name."), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().min(1).max(MAX_PHOTO_BYTES), eventId: objectIdSchema.optional() }).strict();
export const confirmInput = photoInput.extend({ objectKey: z.string().max(250).regex(/^weddings\/[a-f\d]{24}\/uploads\/[a-f\d-]{36}$/) });
const cursorValue = z.object({ date: z.iso.datetime(), id: objectIdSchema, eventId: z.string() }).strict();
export const photoQuery = z.object({ eventId: z.union([objectIdSchema, z.literal("other")]).optional(), limit: z.coerce.number().int().min(1).max(48).default(24), cursor: z.string().max(512).optional() }).strict();
export function readCursor(value: string | undefined, eventId = "") {
  if (!value) return undefined;
  let input: unknown; try { input = JSON.parse(Buffer.from(value, "base64url").toString()); } catch { input = null; }
  const cursor = cursorValue.parse(input);
  z.literal(eventId).parse(cursor.eventId);
  return cursor;
}
export type PhotoInput = z.infer<typeof photoInput>;
export type PhotoView = { id: string; eventId: string | null; url: string; originalFilename: string; mimeType: string; sizeBytes: number; uploaderType: "MEMBER" | "GUEST"; createdAt: string };
export type PhotoPage = { data: PhotoView[]; pagination: { nextCursor: string | null }; total: number };
