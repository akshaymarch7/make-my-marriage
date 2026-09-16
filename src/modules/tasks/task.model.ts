import "server-only";
import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { taskPriorities, taskStatuses } from "./schemas";
const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true }, title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: "", maxlength: 2000 }, assignedMembershipId: { type: Schema.Types.ObjectId, default: null },
  eventId: { type: Schema.Types.ObjectId, default: null }, dueDate: { type: Date, default: null },
  priority: { type: String, enum: taskPriorities, default: "MEDIUM", required: true },
  status: { type: String, enum: taskStatuses, default: "TODO", required: true }, completedAt: { type: Date, default: null },
}, { timestamps: true, collection: "tasks" });
schema.index({ weddingId: 1, status: 1 }); schema.index({ weddingId: 1, dueDate: 1 });
schema.index({ weddingId: 1, assignedMembershipId: 1, status: 1 }); schema.index({ weddingId: 1, eventId: 1 });
export type TaskRow = InferSchemaType<typeof schema>;
export const Task = (models.Task as Model<TaskRow> | undefined) ?? model<TaskRow>("Task", schema);
