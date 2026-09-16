import { eventDateParts } from "@/modules/events/dates";
export const taskDateLabel = (date: string, timeZone: string) => new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
export function isTaskOverdue(task: { dueDate: string | null; status: string }, timeZone: string, today: string) {
  return task.status !== "COMPLETED" && Boolean(task.dueDate && eventDateParts(task.dueDate, timeZone).date < today);
}
