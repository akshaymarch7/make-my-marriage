"use client";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./wedding.module.css";

type Guard = { setDirty: (dirty: boolean) => void; setBusy: (busy: boolean) => void; leave: (action: () => void) => void };
const Context = createContext<Guard | null>(null);
export const useUnsavedChanges = () => useContext(Context);

export function UnsavedChanges({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dirty = useRef(false);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const action = useRef<(() => void) | null>(null);
  const setDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const setBusy = useCallback((value: boolean) => { busy.current = value; }, []);
  const leave = useCallback((next: () => void) => {
    if (busy.current) return;
    if (!dirty.current) { next(); return; }
    action.current = next;
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const onClick = (event: MouseEvent) => {
      if (!dirty.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault(); event.stopPropagation();
      leave(() => router.push(`${url.pathname}${url.search}${url.hash}`));
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [leave, router]);
  return <Context.Provider value={{ setDirty, setBusy, leave }}>{children}
    <dialog ref={dialog} className={styles.discardDialog} aria-labelledby="discard-title" onCancel={() => { action.current = null; }}>
      <h2 id="discard-title">Discard your changes?</h2><p>Your changes haven’t been saved.</p>
      <div><button type="button" className={styles.secondary} autoFocus onClick={() => { action.current = null; dialog.current?.close(); }}>Keep editing</button>
        <button type="button" className={styles.submit} onClick={() => { dirty.current = false; dialog.current?.close(); const next = action.current; action.current = null; next?.(); }}>Discard changes</button></div>
    </dialog>
  </Context.Provider>;
}
