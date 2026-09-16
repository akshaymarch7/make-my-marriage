import "server-only";
import { requireWeddingMember } from "@/modules/memberships/service";
import { listWeddingMemberships } from "@/modules/memberships/repository";
import { findPublicUsersByIds } from "@/modules/auth/repository";
import { findEvents, findEvent } from "@/modules/events/repository";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { createTaskSchema, updateTaskSchema, taskQuerySchema, type TaskOptions, type TaskRecord, type TaskView, type UpdateTaskInput } from "./schemas";
import { findTasks, findTask, insertTask, patchTask, deleteTaskRecord, taskSummaryRecords } from "./repository";
const missing = () => new AppError({ category: "NOT_FOUND", message: "Task not found." });
async function taskScope(userId: string) {
  const { member } = await requireWeddingMember(userId);
  if (!["ADMIN", "MANAGER"].includes(member.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot manage wedding tasks." });
  return member.weddingId;
}
async function options(userId: string, weddingId: string): Promise<TaskOptions> {
  const [members, events] = await Promise.all([listWeddingMemberships(weddingId), findEvents(weddingId, { includeArchived: true })]);
  const current = members.find(member => member.userId === userId);
  if (!current) throw new AppError({ category: "NOT_FOUND", message: "Wedding membership not found." });
  const users = new Map((await findPublicUsersByIds(members.map(member => member.userId))).map(user => [user.id, user.name]));
  return { currentMembershipId: current.membershipId, members: members.map(member => ({ id: member.membershipId, name: users.get(member.userId) ?? "Wedding member", role: member.role })), events: events.map(event => ({ id: event.id, name: event.name, archivedAt: event.archivedAt })) };
}
export async function getTaskOptions(userId: string) { return options(userId, await taskScope(userId)); }
function decorate(task: TaskRecord, choices: TaskOptions): TaskView {
  return { ...task, assignee: choices.members.find(member => member.id === task.assignedMembershipId) ?? null, event: choices.events.find(event => event.id === task.eventId) ?? null };
}
async function validateLinks(weddingId: string, choices: TaskOptions, changes: UpdateTaskInput, existing?: TaskRecord) {
  if (changes.assignedMembershipId && changes.assignedMembershipId !== existing?.assignedMembershipId && !choices.members.some(member => member.id === changes.assignedMembershipId)) throw new AppError({ category: "NOT_FOUND", message: "Wedding member not found.", details: { assignedMembershipId: "Choose a current member of this wedding." } });
  if (changes.eventId && changes.eventId !== existing?.eventId) {
    const event = await findEvent(weddingId, changes.eventId);
    if (!event) throw new AppError({ category: "NOT_FOUND", message: "Event not found.", details: { eventId: "Choose an event from this wedding." } });
    if (event.event.archivedAt) throw new AppError({ category: "VALIDATION_ERROR", message: "Choose an active event.", details: { eventId: "Archived events cannot be assigned to new tasks." } });
  }
}
export async function listTasks(userId: string, input: unknown = {}) {
  const query = taskQuerySchema.parse(input), weddingId = await taskScope(userId);
  const choices = await options(userId, weddingId);
  const result = await findTasks(weddingId, query, choices.currentMembershipId);
  return { data: result.rows.map(task => decorate(task, choices)), pagination: { page: query.page, limit: query.limit, total: result.total, totalPages: Math.ceil(result.total / query.limit) } };
}
export async function getTask(userId: string, taskId: string) {
  objectIdSchema.parse(taskId); const weddingId = await taskScope(userId);
  const found = await findTask(weddingId, taskId); if (!found) throw missing();
  return decorate(found.task, await options(userId, weddingId));
}
export async function createTask(userId: string, input: unknown) {
  const data = createTaskSchema.parse(input), weddingId = await taskScope(userId), choices = await options(userId, weddingId);
  await validateLinks(weddingId, choices, data);
  return decorate(await insertTask(weddingId, data), choices);
}
export async function updateTask(userId: string, taskId: string, input: unknown) {
  objectIdSchema.parse(taskId); const changes = updateTaskSchema.parse(input), weddingId = await taskScope(userId);
  const found = await findTask(weddingId, taskId); if (!found) throw missing();
  const choices = await options(userId, weddingId); await validateLinks(weddingId, choices, changes, found.task);
  const status = changes.status ?? found.task.status;
  const completedAt = status === "COMPLETED" ? found.task.status === "COMPLETED" && found.task.completedAt ? new Date(found.task.completedAt) : new Date() : null;
  const updated = await patchTask(weddingId, taskId, found.version, changes, completedAt);
  if (!updated) throw new AppError({ category: "CONFLICT", message: "This task changed while saving. Reload its latest details before trying again." });
  return decorate(updated, choices);
}
export async function deleteTask(userId: string, taskId: string) {
  objectIdSchema.parse(taskId); if (!await deleteTaskRecord(await taskScope(userId), taskId)) throw missing();
  return { success: true };
}
export async function getTaskSummary(userId: string) {
  const weddingId = await taskScope(userId);
  const [summary, choices] = await Promise.all([taskSummaryRecords(weddingId), options(userId, weddingId)]);
  return { ...summary, upcoming: summary.upcoming.map(task => decorate(task, choices)) };
}
