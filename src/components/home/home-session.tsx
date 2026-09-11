"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { watchSessionChanges } from "@/components/auth/session-events";

export type HomeSessionState = "signed-out" | "onboarding" | "wedding";
const HomeSessionContext = createContext<HomeSessionState>("signed-out");
export const useHomeSession = () => useContext(HomeSessionContext);

export function HomeSession({ initialState, children }: { initialState: HomeSessionState; children: ReactNode }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let controller: AbortController | undefined;
    const check = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: request.signal });
        if (request.signal.aborted) return;
        if (response.status === 401) setState("signed-out");
        else if (response.ok) {
          const result = await response.json();
          if (!request.signal.aborted) setState(result.data.wedding ? "wedding" : "onboarding");
        }
      } catch { /* Keep the last known state when the connection fails. */ }
    };
    const stop = watchSessionChanges(() => { void check(); });
    void check();
    return () => { stop(); controller?.abort(); };
  }, []);

  return <HomeSessionContext.Provider value={state}>{children}</HomeSessionContext.Provider>;
}
