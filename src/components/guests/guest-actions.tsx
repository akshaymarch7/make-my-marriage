"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/components/auth/session-events";
import { type GuestView } from "@/modules/guests/schemas";
import styles from "./guests.module.css";
export function GuestActions({ guest, userId, weddingId, details = false }: { guest: GuestView; userId: string; weddingId: string; details?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), busy = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const router = useRouter();
  async function mutate() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const check = await fetch("/api/auth/me", { cache: "no-store" });
      if (check.status === 401) { setError("Your session expired. Sign in again before changing this guest."); return; }
      if (!check.ok) throw new Error();
      const account = (await check.json()).data;
      if (account.user.id !== userId || account.wedding?.id !== weddingId) { dialog.current?.close(); setConfirming(false); router.refresh(); return; }
      const response = await fetch(`/api/guests/${guest.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        setError(result?.error?.message || "We couldn’t delete this guest. Please try again."); return;
      }
      dialog.current?.close(); setConfirming(false); notifySessionChange(); if (details) router.replace("/guests?deleted=1"); router.refresh();
    } catch { setError("We couldn’t delete this guest. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className={styles.guestActions}><div className={styles.actionRow}>{!details && <><a href={`/guests/${guest.id}`} className={styles.smallLink}>Details</a><a href={`/guests/${guest.id}/edit`} className={styles.smallLink}>Edit</a></>}<button type="button" className={styles.deleteButton} disabled={pending} onClick={() => { setError(""); setConfirming(true); dialog.current?.showModal(); }}>Delete<span className={styles.srOnly}> {guest.name}</span></button></div>{error && !confirming && <p role="alert" className={styles.actionError}>{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-label="Delete this guest?" onCancel={e => { if (busy.current) e.preventDefault(); else setConfirming(false); }}><h2>Delete this guest?</h2><p className={styles.guestName}>{guest.name}</p><p>This guest record will be permanently deleted. Any invitation link associated with it will stop working.</p>{error && <p role="alert" className={styles.actionError}>{error}</p>}<div className={styles.dialogActions}><button type="button" className={styles.secondary} autoFocus disabled={pending} onClick={() => { dialog.current?.close(); setConfirming(false); }}>Keep guest</button><button type="button" className={styles.primary} disabled={pending} aria-busy={pending} onClick={() => { void mutate(); }}>{pending ? "Deleting…" : "Delete guest"}</button></div></dialog>
  </div>;
}
