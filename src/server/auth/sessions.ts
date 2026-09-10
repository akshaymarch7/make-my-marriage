import "server-only";
import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { cookies } from "next/headers";
import { getAuthEnv } from "@/config/env";
import { connectToDatabase } from "@/server/db/mongoose";
import { generateSecureToken, hashToken } from "./tokens";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: "sessions" });
type SessionRecord = InferSchemaType<typeof schema>;
const Session = (mongoose.models.Session as Model<SessionRecord> | undefined) ?? mongoose.model<SessionRecord>("Session", schema);
export function sessionCookieOptions(expires: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires };
}
export async function createSession(userId: string) {
  const env = getAuthEnv();
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86400000);
  await connectToDatabase();
  await Session.init();
  await Session.create({ userId, tokenHash: hashToken(token, env.AUTH_TOKEN_PEPPER), expiresAt });
  return { token, expiresAt };
}
export async function readSession() {
  const token = (await cookies()).get(getAuthEnv().SESSION_COOKIE_NAME)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await connectToDatabase();
  return Session.findOne({ tokenHash: hashToken(token, getAuthEnv().AUTH_TOKEN_PEPPER), expiresAt: { $gt: new Date() } }).lean();
}
export async function revokeSession(id: string) {
  await connectToDatabase();
  await Session.deleteOne({ _id: id });
}
