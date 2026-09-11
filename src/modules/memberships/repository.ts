import "server-only";
import type { ClientSession } from "mongoose";
import { Membership } from "./membership.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import { lockWeddingMemberships } from "@/modules/weddings/repository";
import { AppError } from "@/server/http/app-error";

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

export async function listWeddingMemberships(weddingId: string) {
  objectIdSchema.parse(weddingId);
  await connectToDatabase();
  const members = await Membership.find({ weddingId }).sort({ joinedAt: 1, _id: 1 }).lean();
  return members.map(member => ({ membershipId: member._id.toString(), userId: member.userId.toString(), role: member.role, joinedAt: member.joinedAt.toISOString() }));
}

export async function mutateWeddingMember(userId: string, weddingId: string, membershipId: string, role: "ADMIN" | "MANAGER" | null) {
  [userId, weddingId, membershipId].forEach(id => objectIdSchema.parse(id));
  const connection = (await connectToDatabase()).connection;
  return connection.transaction(async session => {
    if (!await lockWeddingMemberships(weddingId, session)) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
    // Recheck authorization inside the serialized transaction, including actors
    // who were removed or demoted while their request was waiting.
    const actor = await Membership.findOne({ userId, weddingId }).session(session).lean();
    if (actor?.role !== "ADMIN") throw new AppError({ category: "FORBIDDEN", message: "Only an Admin can manage wedding members." });
    const target = await Membership.findOne({ _id: membershipId, weddingId }).session(session).lean();
    if (!target) throw new AppError({ category: "NOT_FOUND", message: "Wedding member not found. Refresh the list and try again." });
    if (target.role === "ADMIN" && role !== "ADMIN" && await Membership.countDocuments({ weddingId, role: "ADMIN" }).session(session) <= 1) {
      throw new AppError({ category: "CONFLICT", code: "LAST_ADMIN", message: "Your wedding needs at least one Admin. Make another member an Admin first." });
    }
    if (role === null) await Membership.deleteOne({ _id: membershipId, weddingId }, { session });
    else await Membership.updateOne({ _id: membershipId, weddingId }, { $set: { role } }, { session });
    return { membershipId, role };
  });
}
