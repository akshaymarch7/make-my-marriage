import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  weddingId: { type: Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: "wedding_memberships" });
schema.index({ weddingId: 1, userId: 1 }, { unique: true });
schema.index({ weddingId: 1, role: 1 });
type MembershipRecord = InferSchemaType<typeof schema>;
export const Membership = (mongoose.models.WeddingMembership as Model<MembershipRecord> | undefined) ?? mongoose.model<MembershipRecord>("WeddingMembership", schema);
