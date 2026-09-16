"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/home/icon";
import styles from "./sharing.module.css";
export function SharingCard({ guestId, name, maxGuests }: { guestId: string; name: string; maxGuests: number }) {
  const [state, setState] = useState<{ url?: string; error?: string }>({}), [attempt, setAttempt] = useState(0), [copied, setCopied] = useState(false), [manual, setManual] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/guests/${guestId}/invitation-link`, { cache: "no-store", signal: controller.signal });
        const result = await response.json().catch(() => null); if (controller.signal.aborted) return;
        if (!response.ok || typeof result?.data?.url !== "string") { setState({ error: response.status === 401 ? "Your session expired. Sign in again to retrieve the invitation link." : result?.error?.message || "We couldn’t retrieve this guest’s invitation link. Please try again." }); return; }
        const url = new URL(result.data.url); if (!["https:", "http:"].includes(url.protocol) || !/^\/invite\/[A-Za-z0-9_-]{43}$/.test(url.pathname)) throw new Error();
        setState({ url: url.toString() });
      } catch { if (!controller.signal.aborted) setState({ error: "We couldn’t retrieve this guest’s invitation link. Please try again." }); }
    };
    void load(); return () => controller.abort();
  }, [guestId, attempt]);
  async function copy() {
    if (!state.url) return; setCopied(false); setManual(false);
    try { await navigator.clipboard.writeText(state.url); setCopied(true); }
    catch { setManual(true); input.current?.focus(); input.current?.select(); }
  }
  return <section className={styles.linkCard} aria-label="Guest invitation link"><p className={styles.eyebrow}>Stable invitation link</p><h2>{name}</h2><p className={styles.capacity}><Icon name="users" size={15}/>Maximum party size: {maxGuests} {maxGuests === 1 ? "person" : "people"} (includes the named guest)</p>
    {state.error ? <div className={styles.error} role="alert"><p>{state.error}</p><button className={styles.secondary} onClick={() => { setState({}); setCopied(false); setManual(false); setAttempt(value => value + 1); }}>Try again</button></div> : !state.url ? <div className={styles.loading} role="status">Retrieving invitation link…</div> : <><label htmlFor="guest-invitation-url" className={styles.urlLabel}>Dedicated invitation URL</label><div className={styles.urlBox}><Icon name="link" size={17}/><textarea ref={input} id="guest-invitation-url" rows={2} readOnly value={state.url} spellCheck={false} onFocus={event => event.target.select()}/></div><div className={styles.actions}><button className={styles.primary} onClick={() => { void copy(); }}><Icon name="copy" size={15}/>Copy invitation link</button><a href={state.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={styles.open}>Open invitation <Icon name="arrow" size={14}/></a></div>{copied && <p role="status" className={styles.success}><Icon name="check" size={14}/>Invitation link copied</p>}{manual && <p role="status" className={styles.manual}>Unable to copy automatically. Please select and copy the link above manually (Cmd+C or Ctrl+C).</p>}</>}
    <div className={styles.privacy}><Icon name="heart" size={20}/><div><p>Share this link privately with this guest or family. Anyone with the link can view this invitation and update its RSVP.</p><small>Copying or opening this link does not send an email or SMS.</small></div></div>
  </section>;
}
