import "server-only";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import { Photo } from "./photo.model";
import type { PhotoInput } from "./schemas";
async function scope(weddingId: string) { objectIdSchema.parse(weddingId); await connectToDatabase(); return { weddingId }; }
export async function reservePhoto(weddingId: string, memberId: string, input: PhotoInput, key: string, expiresAt: Date) {
  return Photo.create({ ...await scope(weddingId), ...input, originalFilename: input.filename, uploadedByMembershipId: memberId, objectKey: key, uploadKey: key, expiresAt });
}
export async function findUpload(weddingId: string, key: string) { return Photo.findOne({ ...await scope(weddingId), uploadKey: key }).lean(); }
export async function findPhoto(weddingId: string, id: string) { objectIdSchema.parse(id); return Photo.findOne({ ...await scope(weddingId), _id: id, status: "READY" }).lean(); }
export async function publishPhoto(weddingId: string, id: string, key: string) { return Photo.findOneAndUpdate({ ...await scope(weddingId), _id: id, status: "PENDING" }, { $set: { status: "READY", objectKey: key } }, { returnDocument: "after" }).lean(); }
export async function markDeleted(weddingId: string, id: string) { await Photo.updateOne({ ...await scope(weddingId), _id: id, status: "READY" }, { $set: { status: "DELETED" } }); }
export async function readPhotos(weddingId: string, eventId: string | undefined, limit: number, cursor?: { date: string; id: string }) {
  const filter = { ...await scope(weddingId), status: "READY" as const, ...(eventId ? { eventId: eventId === "other" ? null : objectIdSchema.parse(eventId) } : {}) };
  const [rows, total] = await Promise.all([Photo.find({ ...filter, ...(cursor ? { $or: [{ createdAt: { $lt: new Date(cursor.date) } }, { createdAt: new Date(cursor.date), _id: { $lt: cursor.id } }] } : {}) }).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean(), Photo.countDocuments(filter)]);
  return { rows, total };
}
