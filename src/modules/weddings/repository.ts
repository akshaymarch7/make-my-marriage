import "server-only";
import type { ClientSession } from "mongoose";
import { Wedding } from "./wedding.model";
import type { CreateWeddingInput, UpdateWeddingInput } from "./schemas";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";

export async function initializeWeddings() {
  const mongoose = await connectToDatabase();
  await Wedding.init();
  return mongoose.connection;
}
export async function insertWedding(input: CreateWeddingInput, userId: string, slug: string, token: string, session: ClientSession) {
  objectIdSchema.parse(userId);
  const [wedding] = await Wedding.create([{ ...input, createdByUserId: userId, website: { slug }, gallery: { token } }], { session });
  return { id: wedding._id.toString(), brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, website: { slug } };
}
export async function findWedding(weddingId: string) {
  objectIdSchema.parse(weddingId);
  await connectToDatabase();
  const wedding = await Wedding.findOne({ _id: weddingId, deletedAt: null }).lean();
  if (!wedding) return null;
  // Explicit public projection: never serialize gallery share secrets or ownership fields.
  return {
    id: wedding._id.toString(), brideName: wedding.brideName, groomName: wedding.groomName,
    title: wedding.title || "", description: wedding.description || "",
    weddingDate: wedding.weddingDate, timeZone: wedding.timeZone,
    location: wedding.location ?? {},
    website: { slug: wedding.website!.slug, theme: wedding.website!.theme, isPublished: wedding.website!.isPublished },
    gallery: { isEnabled: wedding.gallery!.isEnabled, guestUploadsEnabled: wedding.gallery!.guestUploadsEnabled },
    livestream: { youtubeUrl: wedding.livestream!.youtubeUrl, isEnabled: wedding.livestream!.isEnabled },
  };
}

export async function patchWedding(weddingId: string, changes: UpdateWeddingInput) {
  objectIdSchema.parse(weddingId);
  await connectToDatabase();
  const set: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    if (field === "location") {
      for (const [key, item] of Object.entries(value)) if (item !== undefined) set[`location.${key}`] = item;
    } else set[field] = value;
  }
  const result = await Wedding.updateOne({ _id: weddingId, deletedAt: null }, { $set: set }, { runValidators: true });
  return result.matchedCount > 0;
}

// Serialize membership reductions on a shared Wedding write. Counting Admins
// alone in separate snapshot transactions permits concurrent last-Admin loss.
export async function lockWeddingMemberships(weddingId: string, session: ClientSession) {
  objectIdSchema.parse(weddingId);
  const result = await Wedding.updateOne({ _id: weddingId, deletedAt: null }, { $inc: { __v: 1 } }, { session });
  return result.matchedCount > 0;
}
