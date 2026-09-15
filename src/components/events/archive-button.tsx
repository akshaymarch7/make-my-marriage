"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/components/auth/session-events";
import type { WeddingEvent } from "@/modules/events/schemas";
import styles from "./events.module.css";
export function ArchiveEventButton({ event, userId, weddingId }: { event: WeddingEvent; userId: string; weddingId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  if (event.archivedAt) return null;
  async function archive() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const check = await fetch("/api/auth/me", { cache: "no-store" });
      if (check.status === 401) { setError("Your session expired. Sign in again, then reopen this event."); return; }
      if (!check.ok) throw new Error();
      const account = (await check.json()).data;
      if (account.user.id !== userId || account.wedding?.id !== weddingId) { dialog.current?.close(); router.refresh(); return; }
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      dialog.current?.close(); notifySessionChange(); router.refresh();
    } catch { setError("We couldn’t archive this event. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <><button type="button" className={styles.archive} onClick={() => { setError(""); dialog.current?.showModal(); }}>Archive<span className={styles.srOnly}> {event.name}</span></button><dialog ref={dialog} className={styles.dialog} aria-label="Archive this event?" onCancel={e => { if (busy.current) e.preventDefault(); }}>
    <span className={styles.dialogIcon} aria-hidden="true">◇</span><h2>Archive this event?</h2><p className={styles.eventName}>{event.name}</p><p>This event will be hidden from active planning views. Its saved details and existing links to other wedding records will be preserved.</p>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><button type="button" className={styles.secondary} autoFocus disabled={pending} onClick={() => dialog.current?.close()}>Keep event</button><button type="button" className={styles.primary} disabled={pending} aria-busy={pending} onClick={() => { void archive(); }}>{pending ? "Archiving…" : "Archive event"}</button></div>
  </dialog></>;
}
