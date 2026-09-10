import "server-only";
import type { ClientSession } from "mongoose";
import { Membership } from "./membership.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";

export async function initializeMemberships() {
  await connectToDatabase();
  await Membership.init();
}
export async function findMembership(userId: string, session?: ClientSession) {
  objectIdSchema.parse(userId);
  await connectToDatabase();
  const member = await Membership.findOne({ userId }).session(session ?? null).lean();
  return member ? { weddingId: member.weddingId.toString(), role: member.role } : null;
}
export async function createAdminMembership(userId: string, weddingId: string, session: ClientSession) {
  objectIdSchema.parse(userId); objectIdSchema.parse(weddingId);
  await Membership.create([{ userId, weddingId, role: "ADMIN" }], { session });
}
