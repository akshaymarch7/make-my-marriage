import "server-only";
import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { eventTypes } from "./schemas";
const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, maxlength: 150 }, type: { type: String, enum: eventTypes },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, default: null },
  venueName: { type: String, default: "", maxlength: 200 }, address: { type: String, default: "", maxlength: 500 },
  description: { type: String, default: "", maxlength: 2000 }, dressCode: { type: String, default: "", maxlength: 200 },
  archivedAt: { type: Date, default: null },
}, { timestamps: true, collection: "events" });
schema.index({ weddingId: 1, startsAt: 1 });
export type EventRow = InferSchemaType<typeof schema>;
export const Event = (models.Event as Model<EventRow> | undefined) ?? model<EventRow>("Event", schema);
