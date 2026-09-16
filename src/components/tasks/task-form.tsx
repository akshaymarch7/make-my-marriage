"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTaskSchema, taskStatuses, taskPriorities, statusLabels, priorityLabels, type TaskOptions, type TaskView } from "@/modules/tasks/schemas";
import { eventDateParts, eventLocalToUtc } from "@/modules/events/dates";
import { useUnsavedChanges } from "@/components/wedding/unsaved-changes";
import { WeddingDraftNotice, useWeddingDraftSession } from "@/components/wedding/draft-session";
import { notifySessionChange } from "@/components/auth/session-events";
import styles from "./tasks.module.css";
const blank = { title: "", description: "", assignedMembershipId: "", eventId: "", dueDate: "", priority: "MEDIUM", status: "TODO" };
type Field = keyof typeof blank;
export function TaskForm({ task, choices, timeZone }: { task?: TaskView; choices: TaskOptions; timeZone: string }) {
  const [baseline] = useState(() => task ? { title: task.title, description: task.description, assignedMembershipId: task.assignedMembershipId ?? "", eventId: task.eventId ?? "", dueDate: task.dueDate ? eventDateParts(task.dueDate, timeZone).date : "", priority: task.priority, status: task.status } : blank);
  const [values, setValues] = useState(baseline), [errors, setErrors] = useState<Partial<Record<Field, string>>>({}), [failure, setFailure] = useState(""), [pending, setPending] = useState(false);
  const busy = useRef(false), form = useRef<HTMLFormElement>(null);
  const session = useWeddingDraftSession(), guard = useUnsavedChanges(), router = useRouter();
  const dirty = (Object.keys(blank) as Field[]).some(key => values[key] !== baseline[key]);
  const setDirty = guard?.setDirty, setBusy = guard?.setBusy;
  useEffect(() => { setDirty?.(dirty); return () => setDirty?.(false); }, [dirty, setDirty]);
  useEffect(() => { setBusy?.(pending); return () => setBusy?.(false); }, [pending, setBusy]);
  function change(key: Field, value: string) { setValues(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })); setFailure(""); }
  function showErrors(details: Record<string, string | string[]>) {
    const next: Partial<Record<Field, string>> = {};
    for (const [key, value] of Object.entries(details)) if (key in blank) next[key as Field] = Array.isArray(value) ? value[0] : value;
    setErrors(next); const first = Object.keys(next)[0];
    if (first) queueMicrotask(() => form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
    else setFailure("We couldn’t save this task. Check the details and try again.");
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy.current) return;
    setFailure(""); setErrors({});
    let dueDate: string | null = null;
    try { if (values.dueDate) dueDate = task && values.dueDate === baseline.dueDate ? task.dueDate : eventLocalToUtc(values.dueDate, "00:00", timeZone); }
    catch (error) { showErrors({dueDate: (error as Error).message}); return; }
    const parsed = createTaskSchema.safeParse({ ...values, assignedMembershipId: values.assignedMembershipId || null, eventId: values.eventId || null, dueDate });
    if (!parsed.success) { showErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message]))); return; }
    busy.current = true; setPending(true);
    try {
      if (!await session.revalidate()) return;
      const payload: Record<string, unknown> = { ...parsed.data };
      if (task) for (const key of Object.keys(blank) as Field[]) if (values[key] === baseline[key]) delete payload[key];
      const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.status === 401) { session.expire(); return; }
      const result = await response.json().catch(() => null);
      if (response.ok) {
        if (typeof result?.data?.id !== "string" || !result.data.id) { setFailure("We couldn’t confirm whether this task was saved. Your details are still here. Check Tasks before trying again."); return; }
        guard?.setDirty(false); notifySessionChange(); router.replace(`/tasks/${encodeURIComponent(result.data.id)}?saved=${task ? "updated" : "created"}`); router.refresh(); return;
      }
      if (result?.error?.details) showErrors(result.error.details);
      else setFailure(result?.error?.message || "Task saving is temporarily unavailable. Your details are still here. Please try again shortly.");
    } catch { setFailure("We couldn’t connect. Your details are still here. Check your connection and try again."); }
    finally { busy.current = false; setPending(false); }
  }
  const error = (key: Field) => errors[key] && <p id={`${key}-error`} className={styles.fieldError}>{errors[key]}</p>;
  const attrs = (key: Field) => ({ id: key, name: key, value: values[key], "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${key}-error` : undefined });
  const availableEvents = choices.events.filter(event => !event.archivedAt || event.id === task?.eventId);
  return <main id="wedding-content" className={`${styles.page} ${styles.formPage}`}><a href={task ? `/tasks/${task.id}` : "/tasks"} className={styles.back}>← Back to {task ? "task" : "tasks"}</a><p className={styles.eyebrow}>Planning together</p><h1>{task ? "Edit task" : "Add a task"}</h1><p className={styles.intro}>Make the next step clear for everyone.</p><form noValidate ref={form} onSubmit={submit}><WeddingDraftNotice detailsLabel="task details"/><fieldset disabled={pending || session.status !== "active"} className={styles.formFields}>
    <section className={styles.section}><h2>1. Task details</h2><p className={styles.hint}>Give this detail a name and a clear next step.</p><div className={styles.field}><label htmlFor="title">Task title <span>*</span></label><input {...attrs("title")} required maxLength={200} placeholder="e.g. Finalise the Sangeet playlist" onChange={e => change("title", e.target.value)}/>{error("title")}</div><div className={styles.field}><label htmlFor="description">Description <small>(optional)</small></label><textarea {...attrs("description")} maxLength={2000} rows={4} placeholder="Add helpful details for your wedding team…" onChange={e => change("description", e.target.value)}/>{error("description")}</div></section>
    <section className={styles.section}><h2>2. Assignment &amp; planning</h2><p className={styles.hint}>Choose who can help and when this task is due.</p><div className={styles.pair}><div className={styles.field}><label htmlFor="assignedMembershipId">Assigned member <small>(optional)</small></label><select {...attrs("assignedMembershipId")} onChange={e => change("assignedMembershipId", e.target.value)}><option value="">Unassigned</option>{task?.assignedMembershipId && !choices.members.some(member => member.id === task.assignedMembershipId) && <option value={task.assignedMembershipId}>Former member (existing assignment)</option>}{choices.members.map(member => <option key={member.id} value={member.id}>{member.name} ({member.role === "ADMIN" ? "Admin" : "Manager"})</option>)}</select>{error("assignedMembershipId")}</div><div className={styles.field}><label htmlFor="eventId">Related event <small>(optional)</small></label><select {...attrs("eventId")} onChange={e => change("eventId", e.target.value)}><option value="">General wedding task</option>{task?.eventId && !availableEvents.some(event => event.id === task.eventId) && <option value={task.eventId}>Event unavailable (existing association)</option>}{availableEvents.map(event => <option key={event.id} value={event.id}>{event.name}{event.archivedAt ? " (Archived — existing association)" : ""}</option>)}</select>{error("eventId")}{!choices.events.some(event => !event.archivedAt) && <p className={styles.hint}>No active events yet. You can create a general wedding task.</p>}</div></div><div className={styles.pair}><div className={styles.field}><label htmlFor="dueDate">Due date <small>(optional)</small></label><input {...attrs("dueDate")} type="date" onChange={e => change("dueDate", e.target.value)}/>{error("dueDate")}<p className={styles.hint}>Dates follow {timeZone}. Tasks become overdue after their due date.</p></div><div className={styles.field}><label htmlFor="priority">Priority</label><select {...attrs("priority")} onChange={e => change("priority", e.target.value)}>{taskPriorities.map(priority => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select>{error("priority")}</div></div><div className={styles.field}><label htmlFor="status">Status</label><select {...attrs("status")} onChange={e => change("status", e.target.value)}>{taskStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>{error("status")}</div></section></fieldset>{failure && <p role="alert" className={styles.error}>{failure}</p>}{Object.values(errors).some(Boolean) && <p role="alert" className={styles.srOnly}>Please check the highlighted fields.</p>}<div className={styles.formActions}><span>{dirty ? "Unsaved changes" : ""}</span><button type="button" className={styles.secondary} disabled={pending} onClick={() => guard?.leave(() => router.push(task ? `/tasks/${task.id}` : "/tasks"))}>Cancel</button><button type="submit" className={styles.primary} disabled={pending || session.status !== "active" || (Boolean(task) && !dirty)} aria-busy={pending}>{pending ? task ? "Saving changes…" : "Creating task…" : task ? "Save changes" : "Create task"}</button></div></form></main>;
}
