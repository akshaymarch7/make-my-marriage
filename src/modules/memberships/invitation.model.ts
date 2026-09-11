import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  emailNormalized: { type: String, required: true, index: true },
  role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "REVOKED"], default: "PENDING", required: true },
  invitedByUserId: { type: Schema.Types.ObjectId, required: true },
  acceptedByUserId: Schema.Types.ObjectId,
  expiresAt: { type: Date, required: true, index: true },
  acceptedAt: Date,
}, { timestamps: true, collection: "wedding_member_invitations" });
schema.index({ weddingId: 1, status: 1 });
schema.index({ weddingId: 1, emailNormalized: 1 }, { unique: true, partialFilterExpression: { status: "PENDING" } });
type InvitationRecord = InferSchemaType<typeof schema>;
export const MemberInvitation = (mongoose.models.MemberInvitation as Model<InvitationRecord> | undefined) ?? mongoose.model<InvitationRecord>("MemberInvitation", schema);
