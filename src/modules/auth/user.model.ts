import "server-only";
import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  emailNormalized: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, collection: "users" });
type UserRecord = InferSchemaType<typeof schema>;
export const User = (mongoose.models.User as Model<UserRecord> | undefined) ?? mongoose.model<UserRecord>("User", schema);
