"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { watchSessionChanges } from "./session-events";

export function SessionSync({ children, userId }: { children: ReactNode; userId: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let controller: AbortController | undefined;
    const check = async () => {
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
          if (result.data.user.id !== userId) { setHidden(true); router.refresh(); }
          else setHidden(false);
        }
      } catch { /* A network failure does not establish that a session has ended. */ }
    };
    const stop = watchSessionChanges(() => { void check(); });
    void check();
    return () => { stop(); controller?.abort(); };
  }, [router, userId]);
  return hidden ? <p role="status">Updating your session…</p> : children;
}
