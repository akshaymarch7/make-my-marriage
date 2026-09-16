"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/components/auth/session-events";
import { taskStatuses, statusLabels, type TaskView } from "@/modules/tasks/schemas";
import styles from "./tasks.module.css";
export function TaskActions({ task, userId, weddingId, details = false }: { task: TaskView; userId: string; weddingId: string; details?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), busy = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const router = useRouter();
  async function mutate(status?: string) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const check = await fetch("/api/auth/me", { cache: "no-store" });
      if (check.status === 401) { setError("Your session expired. Sign in again before changing this task."); return; }
      if (!check.ok) throw new Error();
      const account = (await check.json()).data;
      if (account.user.id !== userId || account.wedding?.id !== weddingId) { dialog.current?.close(); setConfirming(false); router.refresh(); return; }
      const response = await fetch(`/api/tasks/${task.id}`, status ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) } : { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || (status ? !result?.data?.id : result?.success !== true)) {
        setError(result?.error?.message || (status ? "We couldn’t update this task. Please try again." : "We couldn’t delete this task. Please try again.")); return;
      }
      dialog.current?.close(); setConfirming(false); notifySessionChange(); if (!status && details) router.replace("/tasks?deleted=1"); router.refresh();
    } catch { setError(status ? "We couldn’t update this task. Please try again." : "We couldn’t delete this task. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className={styles.taskActions}><div className={styles.actionRow}><select aria-label={`Status for ${task.title}`} value={task.status} disabled={pending} className={`${styles.statusSelect} ${styles[task.status]}`} onChange={e => { void mutate(e.target.value); }}>{taskStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>{!details && <><a href={`/tasks/${task.id}`} className={styles.smallLink}>Details</a><a href={`/tasks/${task.id}/edit`} className={styles.smallLink}>Edit</a></>}<button type="button" className={styles.deleteButton} disabled={pending} onClick={() => { setError(""); setConfirming(true); dialog.current?.showModal(); }}>Delete<span className={styles.srOnly}> {task.title}</span></button></div>{error && !confirming && <p role="alert" className={styles.actionError}>{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-label="Delete this task?" onCancel={e => { if (busy.current) e.preventDefault(); else setConfirming(false); }}><h2>Delete this task?</h2><p className={styles.taskName}>{task.title}</p><p>This task will be permanently deleted. This cannot be undone.</p>{error && <p role="alert" className={styles.actionError}>{error}</p>}<div className={styles.dialogActions}><button type="button" className={styles.secondary} autoFocus disabled={pending} onClick={() => { dialog.current?.close(); setConfirming(false); }}>Keep task</button><button type="button" className={styles.primary} disabled={pending} aria-busy={pending} onClick={() => { void mutate(); }}>{pending ? "Deleting…" : "Delete task"}</button></div></dialog>
  </div>;
}
