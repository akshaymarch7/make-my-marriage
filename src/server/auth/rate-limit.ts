import "server-only";
import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { connectToDatabase } from "@/server/db/mongoose";
import { getAuthEnv } from "@/config/env";
import { hashToken } from "./tokens";
import { AppError } from "@/server/http/app-error";

const schema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { collection: "auth_rate_limits" });
const Counter = (mongoose.models.AuthRateLimit as Model<InferSchemaType<typeof schema>> | undefined) ?? mongoose.model<InferSchemaType<typeof schema>>("AuthRateLimit", schema);

async function consume(key: string, limit: number, duration: number) {
  const window = Math.floor(Date.now() / duration);
  const id = hashToken(`${key}:${window}`, getAuthEnv().AUTH_TOKEN_PEPPER);
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * duration) } };
  let counter;
  try { counter = await Counter.findOneAndUpdate({ _id: id }, update, { upsert: true, returnDocument: "after" }); }
  catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    counter = await Counter.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  if (!counter || counter.count > limit) throw new AppError({ category: "RATE_LIMITED", message: "Too many attempts. Please try again later." });
}
export async function limitAuth(action: "signup" | "login", email?: string) {
  await connectToDatabase();
  await Counter.init();
  // Shared ceiling bounds distributed attempts without trusting spoofable IP headers.
  if (!email) await consume(`global:${action}`, action === "signup" ? 30 : 60, 60000);
  if (email) await consume(`${action}:${email}`, 10, 15 * 60000);
}
