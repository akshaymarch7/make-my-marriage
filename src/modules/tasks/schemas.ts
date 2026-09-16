import { z } from "zod";
import { objectIdSchema } from "@/server/db/object-id";
export const taskStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export const statusLabels = { TODO: "To Do", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };
export const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const id = objectIdSchema.transform(value => value.toLowerCase());
const fields = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(200, "Use no more than 200 characters."),
  description: z.string().trim().max(2000, "Use no more than 2000 characters.").optional(),
  assignedMembershipId: id.nullable().optional(), eventId: id.nullable().optional(),
  dueDate: z.iso.datetime({ offset: true, message: "Choose a valid due date." }).nullable().optional(),
  priority: z.enum(taskPriorities), status: z.enum(taskStatuses),
}).strict();
export const createTaskSchema = fields.extend({ priority: fields.shape.priority.default("MEDIUM"), status: fields.shape.status.default("TODO") });
export const updateTaskSchema = fields.partial().refine(value => Object.keys(value).length > 0, "Provide at least one change.");
export const taskQuerySchema = z.object({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100000)).optional().default(1),
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional().default(20),
  status: z.enum(taskStatuses).optional(), priority: z.enum(taskPriorities).optional(),
  eventId: z.union([id, z.literal("none")]).optional(), assignedMembershipId: z.union([id, z.literal("none")]).optional(),
  mine: z.enum(["true", "false"]).optional().transform(value => value === "true"),
}).strict();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type TaskRecord = { id: string; title: string; description: string; assignedMembershipId: string | null; eventId: string | null; dueDate: string | null; priority: typeof taskPriorities[number]; status: typeof taskStatuses[number]; completedAt: string | null };
export type TaskOptions = { members: { id: string; name: string; role: string }[]; events: { id: string; name: string; archivedAt: string | null }[]; currentMembershipId: string };
export type TaskView = TaskRecord & { assignee: TaskOptions["members"][number] | null; event: TaskOptions["events"][number] | null };
export type TaskListResult = { data: TaskView[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type TaskSummary = { total: number; completed: number; upcoming: TaskView[] };
