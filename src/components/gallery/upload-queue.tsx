"use client";
/* eslint-disable @next/next/no-img-element -- Private object URLs and local file previews must not enter the public image optimiser. */
import { useEffect, useRef, useState, type RefObject } from "react";
import { MAX_PHOTO_BYTES } from "@/modules/photos/schemas";
import { useWeddingDraftSession, WeddingDraftNotice } from "@/components/wedding/draft-session";
import { useUnsavedChanges } from "@/components/wedding/unsaved-changes";
import { Icon } from "@/components/home/icon";
import styles from "./gallery.module.css";
export type GalleryEvent = { id: string; name: string; archived: boolean };
type Entry = { id: string; file: File; preview?: string; status: "queued" | "uploading" | "confirming" | "done" | "error"; error?: string; invalid?: boolean; progress: number; eventId?: string; objectKey?: string; uploaded?: boolean };
export function fileError(file: File) { return !["image/jpeg", "image/png", "image/webp"].includes(file.type) ? "Choose a JPEG, PNG or WebP photo." : file.size > MAX_PHOTO_BYTES ? "This photo is too large. Maximum size is 10 MB." : !file.size ? "This file is empty." : file.name.length > 255 || /[\x00-\x1f\x7f/\\]/.test(file.name) ? "Choose a file with a valid name." : undefined; }
export async function galleryRequest(url: string, options?: RequestInit) {
  let response: Response; try { response = await fetch(url, { cache: "no-store", ...options }); } catch { throw new Error("We couldn’t connect. Check your connection and try again."); }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in in another tab, then retry." : result?.error?.message ?? "We couldn’t complete this request. Please try again.");
  return result;
}
export function UploadQueue({ dialog, events, onUploaded }: { dialog: RefObject<HTMLDialogElement | null>; events: GalleryEvent[]; onUploaded: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]); const queue = useRef<Entry[]>([]);
  const [eventId, setEventId] = useState(""); const [running, setRunning] = useState(false); const [notice, setNotice] = useState("");
  const active = useRef(false); const alive = useRef(true); const xhr = useRef<XMLHttpRequest | null>(null); const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null); const stopDialog = useRef<HTMLDialogElement>(null);
  const session = useWeddingDraftSession(); const guard = useUnsavedChanges();
  const setDirty = guard?.setDirty;
  function update(next: Entry[]) { queue.current = next; if (alive.current) setEntries([...next]); }
  function patch(id: string, data: Partial<Entry>) { update(queue.current.map(item => item.id === id ? { ...item, ...data } : item)); }
  useEffect(() => { setDirty?.(entries.some(item => item.status !== "done")); return () => setDirty?.(false); }, [entries, setDirty]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; active.current = false; xhr.current?.abort(); controller.current?.abort(); queue.current.forEach(item => { if (item.preview) URL.revokeObjectURL(item.preview); }); }; }, []);
  function add(files: FileList | File[] | null) {
    if (!files || active.current) return;
    const selected = Array.from(files); const room = 20 - queue.current.length;
    setNotice(selected.length > room ? "You can select up to 20 photos at a time. Upload these, then start another batch." : "");
    update([...queue.current, ...selected.slice(0, Math.max(room, 0)).map(file => { const error = fileError(file); return { id: crypto.randomUUID(), file, preview: error ? undefined : URL.createObjectURL(file), status: error ? "error" as const : "queued" as const, progress: 0, invalid: !!error, error }; })]);
  }
  function remove(id: string) { const item = queue.current.find(item => item.id === id); if (item?.preview) URL.revokeObjectURL(item.preview); update(queue.current.filter(item => item.id !== id)); }
  function close() { if (running) { stopDialog.current?.showModal(); return; } dialog.current?.close(); }
  function put(file: File, url: string, id: string) { return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest(); xhr.current = request; request.open("PUT", url); request.setRequestHeader("Content-Type", file.type); request.timeout = 120000;
    request.upload.onprogress = event => { if (event.lengthComputable) patch(id, { progress: Math.round(event.loaded / event.total * 100) }); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("The upload didn’t finish. Retry this photo."));
    request.onerror = request.ontimeout = () => reject(new Error("We couldn’t upload this photo. Check your connection and retry.")); request.onabort = () => reject(new Error("Upload paused. Retry when you’re ready.")); request.send(file);
  }); }
  async function start(onlyId?: string) {
    if (active.current) return; active.current = true; setRunning(true); setNotice(""); let completed = false;
    try {
      if (!await session.revalidate()) return;
      for (const original of [...queue.current]) {
        if (!active.current || !alive.current) break;
        if (original.invalid || original.status === "done" || (onlyId && original.id !== onlyId)) continue;
        const chosenEvent = original.objectKey ? original.eventId : eventId || undefined;
        const data = { filename: original.file.name, mimeType: original.file.type, sizeBytes: original.file.size, ...(chosenEvent ? { eventId: chosenEvent } : {}) };
        controller.current = new AbortController(); const signal = controller.current.signal;
        try {
          patch(original.id, { status: original.uploaded ? "confirming" : "uploading", error: undefined, eventId: chosenEvent });
          let key = original.objectKey;
          if (!original.uploaded) {
            const result = await galleryRequest("/api/photos/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal });
            if (!active.current || signal.aborted) throw new Error("Upload paused. Retry when you’re ready.");
            key = result.data.objectKey; patch(original.id, { objectKey: key, eventId: chosenEvent });
            await put(original.file, result.data.uploadUrl, original.id);
            patch(original.id, { uploaded: true, status: "confirming", progress: 100 });
          }
          if (!active.current || signal.aborted) throw new Error("Upload paused. Retry when you’re ready.");
          await galleryRequest("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, objectKey: key }), signal });
          patch(original.id, { status: "done", error: undefined }); completed = true;
        } catch (error) { if (alive.current) patch(original.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed. Please retry." }); }
      }
    } finally { active.current = false; if (alive.current) { setRunning(false); if (completed) onUploaded(); } }
  }
  const eligible = entries.filter(item => !item.invalid && item.status !== "done").length;
  return <><dialog ref={dialog} className={styles.uploadDialog} aria-labelledby="upload-title" onCancel={event => { if (running) { event.preventDefault(); close(); } }}>
    <header className={styles.modalHead}><div><p className={styles.eyebrow}>A collection of moments</p><h2 id="upload-title">Upload photos</h2></div><button aria-label="Close uploads" onClick={close}><Icon name="close"/></button></header>
    <div className={styles.modalBody}><p className={styles.muted}>Bring your wedding memories together, one photo at a time.</p><WeddingDraftNotice detailsLabel="selected photos"/>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className={styles.fileInput} aria-label="Choose photos" disabled={running} onChange={event => { add(event.target.files); event.target.value = ""; }}/>
      <button className={styles.dropzone} disabled={running} onClick={() => input.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(event.dataTransfer.files); }}><Icon name="photo" size={32}/><strong>Drop your photos here</strong><span>or <u>browse files</u></span><small>JPEG, PNG or WebP · Up to 10 MB each · 20 per batch</small></button>
      <label className={styles.eventSelect}>Assign these photos to an event <span className={styles.muted}>(optional)</span><select value={eventId} disabled={running || entries.some(item => !!item.objectKey)} onChange={event => setEventId(event.target.value)}><option value="">Other / Wedding Memories</option>{events.filter(event => !event.archived).map(event => <option value={event.id} key={event.id}>{event.name}</option>)}</select></label>
      {notice && <p role="status" className={styles.error}>{notice}</p>}
      <div className={styles.queue}>{!running && entries.some(item => item.status === "done") && <button className={styles.textButton} onClick={() => { queue.current.filter(item => item.status === "done").forEach(item => { if (item.preview) URL.revokeObjectURL(item.preview); }); update(queue.current.filter(item => item.status !== "done")); }}>Clear completed photos</button>}{entries.map(item => <div className={styles.queueItem} key={item.id}>{item.preview ? <img src={item.preview} alt=""/> : <div className={styles.fileIcon}><Icon name="photo"/></div>}<div className={styles.queueDetails}><strong title={item.file.name}>{item.file.name}</strong><small>{(item.file.size / 1024 / 1024).toFixed(1)} MB · {item.status === "done" ? "Uploaded ✓" : item.status === "confirming" ? "Verifying photo…" : item.status === "uploading" ? `Uploading ${item.progress}%` : item.status === "queued" ? "Ready to upload" : "Needs attention"}</small>{item.status === "uploading" && <progress max={100} value={item.progress} aria-label={`Uploading ${item.file.name}`}/>} {item.error && <p className={styles.error}>{item.error}</p>}</div>{item.status === "error" && !item.invalid && <button className={styles.textButton} disabled={running} onClick={() => void start(item.id)}>Retry</button>}<button disabled={running} aria-label={`Remove ${item.file.name} from queue`} onClick={() => remove(item.id)}><Icon name="close" size={17}/></button></div>)}</div>
      {entries.length > 0 && <p className={styles.muted} role="status">{entries.filter(item => item.status === "done").length} uploaded · {eligible} remaining · {entries.filter(item => item.invalid).length} invalid</p>}
    </div><footer className={styles.modalFoot}><button className={styles.secondary} onClick={close}>{running ? "Pause & close" : "Close"}</button><button className={styles.primary} disabled={running || !eligible} onClick={() => void start()}>{running ? "Uploading…" : `Upload ${eligible || ""} ${eligible === 1 ? "photo" : "photos"}`}</button></footer>
  </dialog><dialog ref={stopDialog} className={styles.confirmDialog} aria-labelledby="pause-title"><h2 id="pause-title">Pause uploads?</h2><p>Completed photos are saved. Your remaining files will stay selected while this tab stays open.</p><div className={styles.actions}><button className={styles.secondary} autoFocus onClick={() => stopDialog.current?.close()}>Keep uploading</button><button className={styles.primary} onClick={() => { active.current = false; xhr.current?.abort(); controller.current?.abort(); stopDialog.current?.close(); dialog.current?.close(); }}>Pause &amp; close</button></div></dialog></>;
}
