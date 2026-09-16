import "server-only";
import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { rsvpStatuses } from "./schemas";
const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true, maxlength: 120 },
  email: { type: String, default: "", maxlength: 254 }, emailNormalized: { type: String, default: "" }, phone: { type: String, default: "", maxlength: 40 },
  maxGuests: { type: Number, required: true, min: 1, max: 10000, validate: Number.isInteger }, invitedEventIds: { type: [Schema.Types.ObjectId], default: [] }, notes: { type: String, default: "", maxlength: 2000 },
  // Deliberate stable-sharing exception in API_DESIGN §44. Never returned by CRUD.
  invitationToken: { type: String, required: true, select: false }, invitationSentAt: { type: Date, default: null }, lastReminderSentAt: { type: Date, default: null }, reminderCount: { type: Number, default: 0 },
  rsvpStatus: { type: String, enum: rsvpStatuses, default: "PENDING", required: true }, attendingCount: { type: Number, default: null }, rsvpUpdatedAt: { type: Date, default: null },
}, { timestamps: true, collection: "guests" });
schema.index({ invitationToken: 1 }, { unique: true });
schema.index({ weddingId: 1, rsvpStatus: 1 }); schema.index({ weddingId: 1, name: 1 });
schema.index({ weddingId: 1, emailNormalized: 1 }); schema.index({ weddingId: 1, invitedEventIds: 1 });
export type GuestRow = InferSchemaType<typeof schema>;
export const Guest = (models.Guest as Model<GuestRow> | undefined) ?? model<GuestRow>("Guest", schema);
