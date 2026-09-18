import "server-only";
import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true }, eventId: { type: Schema.Types.ObjectId, default: null },
  objectKey: { type: String, required: true }, uploadKey: { type: String, required: true },
  originalFilename: { type: String, required: true }, mimeType: { type: String, required: true }, sizeBytes: { type: Number, required: true },
  uploadedByMembershipId: { type: Schema.Types.ObjectId, required: true }, uploaderType: { type: String, enum: ["MEMBER", "GUEST"], default: "MEMBER", required: true },
  status: { type: String, enum: ["PENDING", "READY", "DELETED"], default: "PENDING", required: true }, expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: "photos" });
schema.index({ objectKey: 1 }, { unique: true }); schema.index({ uploadKey: 1 }, { unique: true });
schema.index({ weddingId: 1, status: 1, createdAt: -1, _id: -1 }); schema.index({ weddingId: 1, status: 1, eventId: 1, createdAt: -1, _id: -1 });
export type PhotoRow = InferSchemaType<typeof schema>;
export const Photo = (models.Photo as Model<PhotoRow> | undefined) ?? model<PhotoRow>("Photo", schema);
