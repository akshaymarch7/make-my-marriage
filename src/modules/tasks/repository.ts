import "server-only";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";
import { Task, type TaskRow } from "./task.model";
import type { CreateTaskInput, UpdateTaskInput, TaskRecord, TaskQuery } from "./schemas";
function project(row: TaskRow & { _id: Types.ObjectId }): TaskRecord {
  return { id: row._id.toString(), title: row.title, description: row.description, assignedMembershipId: row.assignedMembershipId?.toString() ?? null, eventId: row.eventId?.toString() ?? null, dueDate: row.dueDate?.toISOString() ?? null, priority: row.priority, status: row.status, completedAt: row.completedAt?.toISOString() ?? null };
}
async function scope(weddingId: string, taskId?: string) {
  objectIdSchema.parse(weddingId); if (taskId !== undefined) objectIdSchema.parse(taskId);
  await connectToDatabase(); return { weddingId, ...(taskId ? { _id: taskId } : {}) };
}
export async function findTasks(weddingId: string, query: TaskQuery, currentMembershipId: string) {
  objectIdSchema.parse(currentMembershipId);
  const filter = { ...await scope(weddingId), ...(query.status ? { status: query.status } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.eventId ? { eventId: query.eventId === "none" ? null : objectIdSchema.parse(query.eventId) } : {}), ...(query.assignedMembershipId ? { assignedMembershipId: query.assignedMembershipId === "none" ? null : objectIdSchema.parse(query.assignedMembershipId) } : {}), ...(query.mine ? { assignedMembershipId: currentMembershipId } : {}) };
  // An explicit different assignee combined with mine has no matches.
  if (query.mine && query.assignedMembershipId && query.assignedMembershipId.toLowerCase() !== currentMembershipId.toLowerCase()) return { rows: [], total: 0 };
  const [rows, total] = await Promise.all([Task.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), Task.countDocuments(filter)]);
  return { rows: rows.map(project), total };
}
export async function findTask(weddingId: string, taskId: string) {
  const row = await Task.findOne(await scope(weddingId, taskId)).lean();
  return row ? { task: project(row), version: row.__v } : null;
}
export async function insertTask(weddingId: string, input: CreateTaskInput) {
  await scope(weddingId);
  return project(await Task.create({ ...input, weddingId, completedAt: input.status === "COMPLETED" ? new Date() : null }));
}
export async function patchTask(weddingId: string, taskId: string, version: number, input: UpdateTaskInput, completedAt: Date | null) {
  const row = await Task.findOneAndUpdate({ ...await scope(weddingId, taskId), __v: version }, { $set: { ...input, completedAt }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true }).lean();
  return row ? project(row) : null;
}
export async function deleteTaskRecord(weddingId: string, taskId: string) {
  return (await Task.deleteOne(await scope(weddingId, taskId))).deletedCount > 0;
}
export async function taskSummaryRecords(weddingId: string) {
  const filter = await scope(weddingId);
  const [total, completed, rows] = await Promise.all([Task.countDocuments(filter), Task.countDocuments({ ...filter, status: "COMPLETED" }), Task.find({ ...filter, status: { $ne: "COMPLETED" }, dueDate: { $ne: null } }).sort({ dueDate: 1, _id: 1 }).limit(4).lean()]);
  return { total, completed, upcoming: rows.map(project) };
}
