// Only an opaque change marker is shared. Credentials and user data stay out of storage.
const SESSION_CHANGE_KEY = "mmm:session-change";
export function notifySessionChange() {
  try { localStorage.setItem(SESSION_CHANGE_KEY, crypto.randomUUID()); }
  catch { /* Storage may be disabled; focus checks still revalidate the session. */ }
}

export function watchSessionChanges(revalidate: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_CHANGE_KEY || event.key === null) revalidate();
  };
  const onVisibility = () => { if (document.visibilityState === "visible") revalidate(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", revalidate);
  window.addEventListener("pageshow", revalidate);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", revalidate);
    window.removeEventListener("pageshow", revalidate);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
