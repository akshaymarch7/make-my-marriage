"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createGuestSchema, rsvpLabels, attendanceLabel, type GuestEvent, type GuestView } from "@/modules/guests/schemas";
import { eventDayLabel } from "@/modules/events/dates";
import { useUnsavedChanges } from "@/components/wedding/unsaved-changes";
import { WeddingDraftNotice, useWeddingDraftSession } from "@/components/wedding/draft-session";
import { notifySessionChange } from "@/components/auth/session-events";
import styles from "./guests.module.css";
const blank = { name: "", email: "", phone: "", maxGuests: "1", invitedEventIds: [] as string[], notes: "" };
type Field = keyof typeof blank;
export function GuestForm({ guest, events, timeZone }: { guest?: GuestView; events: GuestEvent[]; timeZone: string }) {
  const [baseline] = useState(() => guest ? { name: guest.name, email: guest.email, phone: guest.phone, maxGuests: String(guest.maxGuests), invitedEventIds: guest.invitedEventIds, notes: guest.notes } : blank);
  const [values, setValues] = useState(baseline), [errors, setErrors] = useState<Partial<Record<Field, string>>>({}), [failure, setFailure] = useState(""), [pending, setPending] = useState(false);
  const busy = useRef(false), form = useRef<HTMLFormElement>(null);
  const session = useWeddingDraftSession(), guard = useUnsavedChanges(), router = useRouter();
  const dirty = (Object.keys(blank) as Field[]).some(key => JSON.stringify(values[key]) !== JSON.stringify(baseline[key]));
  const setDirty = guard?.setDirty, setBusy = guard?.setBusy;
  useEffect(() => { setDirty?.(dirty); return () => setDirty?.(false); }, [dirty, setDirty]);
  useEffect(() => { setBusy?.(pending); return () => setBusy?.(false); }, [pending, setBusy]);
  function change(key: Field, value: string | string[]) { setValues(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })); setFailure(""); }
  function showErrors(details: Record<string, string | string[]>) {
    const next: Partial<Record<Field, string>> = {};
    for (const [key, value] of Object.entries(details)) if (key.split(".")[0] in blank) next[key.split(".")[0] as Field] = Array.isArray(value) ? value[0] : value;
    setErrors(next); const first = Object.keys(next)[0];
    if (first) queueMicrotask(() => form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
    else setFailure("We couldn’t save this guest. Check the details and try again.");
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy.current) return;
    setFailure(""); setErrors({});
    const parsed = createGuestSchema.safeParse({ ...values, maxGuests: Number(values.maxGuests) });
    if (!parsed.success) { showErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message]))); return; }
    busy.current = true; setPending(true);
    try {
      if (!await session.revalidate()) return;
      const payload: Record<string, unknown> = { ...parsed.data };
      if (guest) for (const key of Object.keys(blank) as Field[]) if (JSON.stringify(values[key]) === JSON.stringify(baseline[key])) delete payload[key];
      const response = await fetch(guest ? `/api/guests/${guest.id}` : "/api/guests", { method: guest ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.status === 401) { session.expire(); return; }
      const result = await response.json().catch(() => null);
      if (response.ok) {
        if (typeof result?.data?.id !== "string" || !result.data.id) { setFailure("We couldn’t confirm whether this guest was saved. Your details are still here. Check Guests before trying again."); return; }
        guard?.setDirty(false); notifySessionChange(); router.replace(`/guests/${encodeURIComponent(result.data.id)}?saved=${guest ? "updated" : "created"}`); router.refresh(); return;
      }
      if (result?.error?.details) showErrors(result.error.details);
      else setFailure(result?.error?.message || "Guest saving is temporarily unavailable. Your details are still here. Please try again shortly.");
    } catch { setFailure("We couldn’t connect. Your details are still here. Check your connection and try again."); }
    finally { busy.current = false; setPending(false); }
  }
  const error = (key: Field) => errors[key] && <p id={`${key}-error`} className={styles.fieldError}>{errors[key]}</p>;
  const attrs = (key: Field) => ({ id: key, name: key, value: typeof values[key] === "string" ? values[key] : undefined, "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${key}-error` : undefined });
  const availableEvents = events.filter(event => !event.archivedAt || guest?.invitedEventIds.includes(event.id));
  const missingEvents = guest?.invitedEventIds.filter(id => !events.some(event => event.id === id)) ?? [];
  const toggleEvent = (id: string) => change("invitedEventIds", values.invitedEventIds.includes(id) ? values.invitedEventIds.filter(value => value !== id) : [...values.invitedEventIds, id]);
  return <main id="wedding-content" className={styles.page}><a href={guest ? `/guests/${guest.id}` : "/guests"} className={styles.back}>← Back to {guest ? "guest" : "guests"}</a><p className={styles.eyebrow}>Planning / Guests</p><h1>{guest ? "Edit guest" : "Add a guest"}</h1><p className={styles.intro}>Create a place for every person and family in your celebration.</p><div className={styles.formLayout}><form noValidate ref={form} onSubmit={submit}><WeddingDraftNotice detailsLabel="guest details"/><fieldset disabled={pending || session.status !== "active"} className={styles.formFields}>
    <section className={styles.section}><h2>1. Guest details</h2><p className={styles.notice}>One guest record represents one invitation or family group. Adding a guest does not send an invitation.</p><div className={styles.field}><label htmlFor="name">Guest name <span>*</span></label><input {...attrs("name")} required maxLength={120} placeholder="e.g. Rajesh Sharma & family" onChange={e => change("name", e.target.value)}/>{error("name")}</div><div className={styles.pair}><div className={styles.field}><label htmlFor="email">Email <small>(optional)</small></label><input {...attrs("email")} type="email" autoComplete="email" maxLength={254} placeholder="name@example.com" onChange={e => change("email", e.target.value)}/>{error("email")}</div><div className={styles.field}><label htmlFor="phone">Phone <small>(optional)</small></label><input {...attrs("phone")} type="tel" autoComplete="tel" maxLength={40} placeholder="+91 98765 43210" onChange={e => change("phone", e.target.value)}/>{error("phone")}</div></div></section>
    <section className={styles.section}><h2>2. Invitation planning</h2><div className={styles.field}><label htmlFor="maxGuests">Maximum party size <span>*</span></label><input {...attrs("maxGuests")} type="number" required min={1} max={10000} step={1} onChange={e => change("maxGuests", e.target.value)} aria-describedby={errors.maxGuests ? "maxGuests-error party-hint" : "party-hint"}/>{error("maxGuests")}<p id="party-hint" className={styles.notice}>Includes the named guest. For example, enter 4 for a family of four.</p></div><fieldset className={styles.eventPicker} aria-describedby={errors.invitedEventIds ? "invitedEventIds-error" : undefined}><legend>Invited events <small>(optional)</small></legend><p className={styles.hint}>Choose the celebrations this guest is invited to.</p>{availableEvents.map(event => <label key={event.id} className={styles.eventChoice}><input type="checkbox" name="invitedEventIds" value={event.id} checked={values.invitedEventIds.includes(event.id)} onChange={() => toggleEvent(event.id)}/><span><strong>{event.name}{event.archivedAt && <small className={styles.badge}>Archived</small>}</strong><small>{eventDayLabel(event.startsAt, timeZone)}</small></span></label>)}{missingEvents.map(id => <label key={id} className={styles.eventChoice}><input type="checkbox" name="invitedEventIds" value={id} checked={values.invitedEventIds.includes(id)} onChange={() => toggleEvent(id)}/><span>Event unavailable <small>Existing association</small></span></label>)}{!events.some(event => !event.archivedAt) && <p className={styles.notice}>No active events yet. You can add this guest now and choose events later.</p>}{error("invitedEventIds")}</fieldset></section>
    <section className={styles.section}><h2>3. Additional details</h2><div className={styles.field}><label htmlFor="notes">Notes <small>(optional)</small></label><textarea {...attrs("notes")} rows={4} maxLength={2000} placeholder="Anything helpful for your wedding team…" onChange={e => change("notes", e.target.value)}/>{error("notes")}<p className={styles.hint}>Notes are for your wedding team.</p></div></section></fieldset>{failure && <p role="alert" className={styles.error}>{failure}</p>}{Object.values(errors).some(Boolean) && <p role="alert" className={styles.srOnly}>Please check the highlighted fields.</p>}<div className={styles.formActions}><span>{dirty ? "Unsaved changes" : ""}</span><button type="button" className={styles.secondary} disabled={pending} onClick={() => guard?.leave(() => router.push(guest ? `/guests/${guest.id}` : "/guests"))}>Cancel</button><button type="submit" className={styles.primary} disabled={pending || session.status !== "active" || (Boolean(guest) && !dirty)} aria-busy={pending}>{pending ? guest ? "Saving changes…" : "Creating guest…" : guest ? "Save changes" : "Create guest"}</button></div></form>
    <aside className={styles.formAside}><section className={styles.section}><p className={styles.eyebrow}>Planning together</p><h2>Every guest has a place.</h2><p className={styles.hint}>Keep families together in one record, and choose the celebrations they will share with you.</p><dl className={styles.sideFacts}><div><dt>RSVP status</dt><dd><span className={`${styles.badge} ${styles[guest?.rsvpStatus ?? "PENDING"]}`}>{rsvpLabels[guest?.rsvpStatus ?? "PENDING"]}</span></dd></div><div><dt>Attendance</dt><dd>{guest ? attendanceLabel(guest) : "Awaiting response"}</dd></div></dl><p className={styles.hint}>RSVP information is read-only here.</p></section><section className={styles.tip}><p className={styles.eyebrow}>A thoughtful detail</p><p>A family of four needs one guest record with a maximum party size of 4, including the named guest.</p></section></aside></div></main>;
}
