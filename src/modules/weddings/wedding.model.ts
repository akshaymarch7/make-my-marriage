import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  brideName: { type: String, required: true },
  groomName: { type: String, required: true },
  title: String,
  description: String,
  weddingDate: { type: String, required: true },
  timeZone: { type: String, required: true },
  location: {
    formattedAddress: String, city: String, state: String, country: String,
    latitude: Number, longitude: Number, googlePlaceId: String,
  },
  website: {
    slug: { type: String, required: true, unique: true },
    theme: { type: String, default: "classic" },
    isPublished: { type: Boolean, default: false },
  },
  gallery: {
    // API_DESIGN section 108 supersedes the older hash-only gallery schema.
    token: { type: String, required: true, unique: true, select: false },
    isEnabled: { type: Boolean, default: false },
    guestUploadsEnabled: { type: Boolean, default: false },
  },
  livestream: { youtubeUrl: { type: String, default: null }, isEnabled: { type: Boolean, default: false } },
  createdByUserId: { type: Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "weddings" });
export type WeddingRecord = InferSchemaType<typeof schema>;
export const Wedding = (mongoose.models.Wedding as Model<WeddingRecord> | undefined) ?? mongoose.model<WeddingRecord>("Wedding", schema);
