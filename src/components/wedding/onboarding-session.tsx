"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { watchSessionChanges } from "@/components/auth/session-events";
import styles from "./wedding.module.css";

type Status = "active" | "checking" | "expired" | "unavailable" | "changed";
type Session = { status: Status; revalidate: () => Promise<boolean>; expire: () => void };
const Context = createContext<Session | null>(null);

export function useOnboardingSession() {
  const session = useContext(Context);
  if (!session) throw new Error("Onboarding requires its session boundary.");
  return session;
}

export function OnboardingSession({ userId, children }: { userId: string; children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const controller = useRef<AbortController | null>(null);
  const expire = useCallback(() => {
    controller.current?.abort();
    setStatus("expired");
  }, []);
  const revalidate = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store", signal: request.signal });
      if (request.signal.aborted) return false;
      if (response.status === 401) { setStatus("expired"); return false; }
      if (!response.ok) { setStatus("unavailable"); return false; }
      const result = await response.json();
      if (request.signal.aborted) return false;
      if (result.data.user.id !== userId || result.data.wedding) {
        // Unmount the draft before refreshing into a different account or wedding.
        setStatus("changed");
        router.refresh();
        return false;
      }
      setStatus("active");
      return true;
    } catch {
      if (!request.signal.aborted) setStatus("unavailable");
      return false;
    }
  }, [router, userId]);

  useEffect(() => {
    let mounted = true;
    const stop = watchSessionChanges(() => { void revalidate(); });
    // Start after mounting; cleanup also cancels a Strict Mode mount probe.
    queueMicrotask(() => { if (mounted) void revalidate(); });
    return () => { mounted = false; stop(); controller.current?.abort(); };
  }, [revalidate]);

  return <Context.Provider value={{ status, revalidate, expire }}>
    {status === "changed" ? <p role="status">Updating your session…</p> : children}
  </Context.Provider>;
}

export function OnboardingSessionNotice() {
  const { status, revalidate } = useOnboardingSession();
  if (status === "active" || status === "changed") return null;
  return <div className={styles.saveError} role="status">
    {status === "checking" ? "Checking your session…" : <>
      <p>{status === "expired"
        ? "Your session expired. Sign in in another tab to continue. Your wedding details will stay here."
        : "We couldn’t verify your session. Check your connection and try again. Your wedding details will stay here."}</p>
      {status === "expired" && <a href="/login" target="_blank" rel="noopener noreferrer">Sign in in another tab ↗</a>}
      <button type="button" className={styles.suggest} onClick={() => { void revalidate(); }}>Check session again</button>
      <p className={styles.draftHint}>Keep this tab open. Refreshing or closing it will discard this draft.</p>
    </>}
  </div>;
}
