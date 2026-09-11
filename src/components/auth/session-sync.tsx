"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { watchSessionChanges } from "./session-events";

export function SessionSync({ children, userId, weddingId }: { children: ReactNode; userId: string; weddingId?: string | null }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let controller: AbortController | undefined;
    const check = async (refresh = false) => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: request.signal });
        if (request.signal.aborted) return;
        if (response.status === 401) {
          setHidden(true);
          router.replace("/login");
          router.refresh();
        } else if (response.ok) {
          const result = await response.json();
          if (request.signal.aborted) return;
          if (result.data.user.id !== userId || (weddingId !== undefined && (result.data.wedding?.id ?? null) !== weddingId)) { setHidden(true); router.refresh(); }
          else { setHidden(false); if (refresh) router.refresh(); }
        }
      } catch { /* A network failure does not establish that a session has ended. */ }
    };
    const stop = watchSessionChanges(() => { void check(true); });
    void check();
    return () => { stop(); controller?.abort(); };
  }, [router, userId, weddingId]);
  return hidden ? <p role="status">Updating your session…</p> : children;
}
