import "server-only";
import type { ClientSession } from "mongoose";
import { Wedding } from "./wedding.model";
import type { CreateWeddingInput } from "./schemas";
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
