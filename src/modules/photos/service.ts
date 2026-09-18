import "server-only";
import { randomUUID } from "node:crypto";
import { listWeddingMemberships } from "@/modules/memberships/repository";
import { requireWeddingMember } from "@/modules/memberships/service";
import { findEvent, findEvents } from "@/modules/events/repository";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { limitPhotoUploads } from "@/server/auth/rate-limit";
import * as storage from "@/server/storage/r2";
import * as repository from "./repository";
import { photoInput, confirmInput, photoQuery, readCursor, type PhotoView } from "./schemas";
const missing = () => new AppError({ category: "NOT_FOUND", message: "Photo not found." });
async function scope(userId: string) { const { member } = await requireWeddingMember(userId); if (!["ADMIN", "MANAGER"].includes(member.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot manage this gallery." }); const current = (await listWeddingMemberships(member.weddingId)).find(row => row.userId === userId); if (!current) throw missing(); return { ...member, id: current.membershipId }; }
async function activeEvent(weddingId: string, eventId?: string) { if (eventId) { const found = await findEvent(weddingId, eventId); if (!found || found.event.archivedAt) throw new AppError({ category: "NOT_FOUND", message: "Choose an active event from your wedding." }); } }
export async function galleryEvents(userId: string) { const member = await scope(userId); return findEvents(member.weddingId, { includeArchived: true }); }
export async function requestUpload(userId: string, input: unknown) {
  const data = photoInput.parse(input); const member = await scope(userId); await activeEvent(member.weddingId, data.eventId);
  await limitPhotoUploads(member.weddingId, member.id);
  const key = `weddings/${member.weddingId}/uploads/${randomUUID()}`; const expiresAt = new Date(Date.now() + 600000);
  const uploadUrl = await storage.signUpload(key, data.mimeType, data.sizeBytes);
  await repository.reservePhoto(member.weddingId, member.id, data, key, expiresAt);
  return { uploadUrl, objectKey: key, expiresAt: expiresAt.toISOString() };
}
export async function confirmUpload(userId: string, input: unknown) {
  const data = confirmInput.parse(input); const member = await scope(userId);
  const pending = await repository.findUpload(member.weddingId, data.objectKey);
  if (!pending || pending.uploadedByMembershipId.toString() !== member.id || pending.status === "DELETED") throw missing();
  if (pending.originalFilename !== data.filename || pending.mimeType !== data.mimeType || pending.sizeBytes !== data.sizeBytes || (pending.eventId?.toString() ?? undefined) !== data.eventId) throw new AppError({ category: "UPLOAD_ERROR", message: "The upload details changed. Choose the photo again." });
  if (pending.status === "READY") return { id: pending._id.toString() };
  // Allow confirming an upload after its PUT URL expires, including reauthentication.
  if (pending.expiresAt.getTime() + 86400000 < Date.now()) throw new AppError({ category: "UPLOAD_ERROR", message: "This upload expired. Remove it and select the photo again." });
  const finalKey = `weddings/${member.weddingId}/gallery/${randomUUID()}`;
  await storage.verifyAndCopy(data.objectKey, finalKey, data.mimeType, data.sizeBytes);
  let published;
  try { published = await repository.publishPhoto(member.weddingId, pending._id.toString(), finalKey); }
  catch (error) { /* An ambiguous database write may have committed. Keep the verified object for retry/reconciliation. */ throw error; }
  if (!published) {
    await storage.deleteObject(finalKey).catch(() => undefined);
    const winner = await repository.findPhoto(member.weddingId, pending._id.toString()); if (!winner) throw missing();
  }
  await storage.deleteObject(data.objectKey).catch(() => undefined);
  return { id: pending._id.toString() };
}
export async function listPhotos(userId: string, input: unknown) {
  const query = photoQuery.parse(input); const cursor = readCursor(query.cursor, query.eventId); const member = await scope(userId);
  const { rows, total } = await repository.readPhotos(member.weddingId, query.eventId, query.limit, cursor);
  const visible = rows.slice(0, query.limit);
  const data: PhotoView[] = await Promise.all(visible.map(async row => ({ id: row._id.toString(), eventId: row.eventId?.toString() ?? null, url: await storage.signRead(row.objectKey), originalFilename: row.originalFilename, mimeType: row.mimeType, sizeBytes: row.sizeBytes, uploaderType: row.uploaderType, createdAt: row.createdAt.toISOString() })));
  const last = visible.at(-1); const nextCursor = rows.length > query.limit && last ? Buffer.from(JSON.stringify({ date: last.createdAt.toISOString(), id: last._id.toString(), eventId: query.eventId ?? "" })).toString("base64url") : null;
  return { data, pagination: { nextCursor }, total };
}
export async function downloadPhoto(userId: string, id: string) { objectIdSchema.parse(id); const member = await scope(userId); const photo = await repository.findPhoto(member.weddingId, id); if (!photo) throw missing(); return storage.signRead(photo.objectKey, photo.originalFilename); }
export async function removePhoto(userId: string, id: string) { objectIdSchema.parse(id); const member = await scope(userId); const photo = await repository.findPhoto(member.weddingId, id); if (!photo) throw missing(); await storage.deleteObject(photo.objectKey); await repository.markDeleted(member.weddingId, id); return { success: true }; }
