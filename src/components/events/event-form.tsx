"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createEventSchema, eventTypes, type WeddingEvent } from "@/modules/events/schemas";
import { eventDateParts, eventLocalToUtc } from "@/modules/events/dates";
import { useUnsavedChanges } from "@/components/wedding/unsaved-changes";
import { WeddingDraftNotice, useWeddingDraftSession } from "@/components/wedding/draft-session";
import { notifySessionChange } from "@/components/auth/session-events";
import styles from "./events.module.css";
const blank = { name: "", type: "CUSTOM", startDate: "", startTime: "", endDate: "", endTime: "", venueName: "", address: "", description: "", dressCode: "" };
type Values = typeof blank;
type Field = keyof Values;
function initialValues(event: WeddingEvent | undefined, timeZone: string): Values {
  if (!event) return blank;
  const start = eventDateParts(event.startsAt, timeZone), end = event.endsAt ? eventDateParts(event.endsAt, timeZone) : null;
  return { name: event.name, type: event.type ?? "CUSTOM", startDate: start.date, startTime: start.time, endDate: end?.date ?? "", endTime: end?.time ?? "", venueName: event.venueName, address: event.address, description: event.description, dressCode: event.dressCode };
}
export function EventForm({ event, timeZone }: { event?: WeddingEvent; timeZone: string }) {
  const [baseline] = useState(() => initialValues(event, timeZone));
  const [values, setValues] = useState(baseline);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const guard = useUnsavedChanges(), session = useWeddingDraftSession(), router = useRouter();
  const dirty = (Object.keys(blank) as Field[]).some(key => values[key] !== baseline[key]);
  const setDirty = guard?.setDirty, setBusy = guard?.setBusy;
  useEffect(() => { setDirty?.(dirty); return () => setDirty?.(false); }, [dirty, setDirty]);
  useEffect(() => { setBusy?.(pending); return () => setBusy?.(false); }, [pending, setBusy]);
  function update(field: Field, value: string) { setValues(previous => ({ ...previous, [field]: value })); setErrors(previous => ({ ...previous, [field]: undefined })); setFailure(""); }
  function showErrors(details: Record<string, string | string[]>) {
    const next: Partial<Record<Field, string>> = {};
    for (const [key, value] of Object.entries(details)) {
      const field = key === "startsAt" ? "startTime" : key === "endsAt" ? "endTime" : key;
      if (field in blank) next[field as Field] = Array.isArray(value) ? value[0] : value;
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) queueMicrotask(() => form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
    else setFailure("We couldn’t save this event. Please check the details and try again.");
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy.current) return;
    setFailure(""); setErrors({});
    const { startDate, startTime, endDate, endTime, ...rest } = values;
    const localErrors: Record<string, string> = {};
    let startsAt = "", endsAt: string | null = null;
    if (!startDate) localErrors.startDate = "Choose a start date.";
    if (!startTime) localErrors.startTime = "Choose a start time.";
    if (startDate && startTime) try { startsAt = event && startDate === baseline.startDate && startTime === baseline.startTime ? event.startsAt : eventLocalToUtc(startDate, startTime, timeZone); } catch (error) { localErrors.startTime = (error as Error).message; }
    if (endDate || endTime) {
      if (!endDate) localErrors.endDate = "Choose an end date, or clear the end time.";
      if (!endTime) localErrors.endTime = "Choose an end time, or clear the end date.";
      if (endDate && endTime) try { endsAt = event && endDate === baseline.endDate && endTime === baseline.endTime ? event.endsAt : eventLocalToUtc(endDate, endTime, timeZone); } catch (error) { localErrors.endTime = (error as Error).message; }
    }
    const parsed = createEventSchema.safeParse({ ...rest, startsAt, endsAt });
    if (!parsed.success) for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "startsAt" ? "startTime" : issue.path[0] === "endsAt" ? "endTime" : String(issue.path[0]);
      localErrors[key] ??= issue.message;
    }
    if (Object.keys(localErrors).length || !parsed.success) { showErrors(localErrors); return; }
    busy.current = true; setPending(true);
    try {
      if (!await session.revalidate()) return;
      const payload: Record<string, unknown> = { ...parsed.data };
      if (event) {
        for (const key of Object.keys(rest) as (keyof typeof rest)[]) if (values[key] === baseline[key]) delete payload[key];
        if (startDate === baseline.startDate && startTime === baseline.startTime) delete payload.startsAt;
        if (endDate === baseline.endDate && endTime === baseline.endTime) delete payload.endsAt;
      }
      const response = await fetch(event ? `/api/events/${event.id}` : "/api/events", { method: event ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.status === 401) { session.expire(); return; }
      // Framework/proxy failures can return HTML rather than the API JSON envelope.
      // Keep the draft and do not mistake a parsing failure for a lost connection.
      const result = await response.json().catch(() => null);
      if (response.ok) {
        if (typeof result?.data?.id !== "string" || !result.data.id) {
          setFailure("We couldn’t confirm whether this event was saved. Your details are still here. Check Events before trying again.");
          return;
        }
        guard?.setDirty(false); notifySessionChange(); router.replace(`/events/${encodeURIComponent(result.data.id)}?saved=${event ? "updated" : "created"}`); router.refresh(); return;
      }
      if (result?.error?.details) showErrors(result.error.details);
      else setFailure(result?.error?.message || "Event saving is temporarily unavailable. Your details are still here. Please try again shortly.");
    } catch { setFailure("We couldn’t connect. Your details are still here. Check your connection and try again."); }
    finally { busy.current = false; setPending(false); }
  }
  function field(key: Field, label: string, options: { type?: string; required?: boolean; maxLength?: number; placeholder?: string } = {}) {
    return <div className={styles.field}><label htmlFor={key}>{label}{options.required ? <span> *</span> : <small> (optional)</small>}</label><input id={key} name={key} value={values[key]} {...options} onChange={e => update(key, e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined}/>{error(key)}</div>;
  }
  const error = (key: Field) => errors[key] && <p id={`${key}-error`} className={styles.fieldError}>{errors[key]}</p>;
  return <main id="wedding-content" className={`${styles.page} ${styles.formPage}`}><a href={event ? `/events/${event.id}` : "/events"} className={styles.back}>← Back to {event ? "event" : "events"}</a><p className={styles.eyebrow}>Itinerary management</p><h1>{event ? "Edit event" : "Add an event"}</h1><p className={styles.intro}>{event ? "Keep the details of your celebration up to date." : "Create a new celebration for your wedding itinerary."}</p>
    <form ref={form} noValidate onSubmit={submit}>
      <WeddingDraftNotice detailsLabel="event details"/>
      <fieldset disabled={pending || session.status !== "active"} className={styles.formFields}>
        <section className={styles.section}><h2>1. Event details</h2><p className={styles.sectionHint}>Basic information and nature of this celebration.</p>{field("name", "Event name", { required: true, maxLength: 150, placeholder: "e.g. Sangeet & Cocktail Night" })}<div className={styles.field}><label htmlFor="type">Event type <span>*</span></label><select id="type" name="type" value={values.type} onChange={e => update("type", e.target.value)} required>{eventTypes.map(type => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}</select></div><div className={styles.field}><label htmlFor="description">Description <small>(optional)</small></label><textarea id="description" name="description" rows={3} maxLength={2000} value={values.description} onChange={e => update("description", e.target.value)} placeholder="Add schedule notes, themes, or special details for this event…" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{error("description")}</div></section>
        <section className={styles.section}><h2>2. Date &amp; time</h2><p className={styles.sectionHint}>Specify the planned schedule of your celebration.</p><p className={styles.zone}>All times in {timeZone}. All events follow the wedding time zone.</p><div className={styles.pair}>{field("startDate", "Start date", { type: "date", required: true })}{field("startTime", "Start time", { type: "time", required: true })}</div><div className={styles.pair}>{field("endDate", "End date", { type: "date" })}{field("endTime", "End time", { type: "time" })}</div><p className={styles.sectionHint}>For an overnight event, choose the following day as its end date. Leave both end fields empty if the end time is undecided.</p></section>
        <section className={styles.section}><h2>3. Venue &amp; additional details</h2><p className={styles.sectionHint}>Help everyone arrive in the right place, dressed for the occasion.</p>{field("venueName", "Venue name", { maxLength: 200, placeholder: "e.g. Grand ballroom" })}{field("address", "Address", { maxLength: 500, placeholder: "Venue address" })}{field("dressCode", "Dress code", { maxLength: 200, placeholder: "e.g. Traditional pastels" })}</section>
      </fieldset>
      {failure && <p role="alert" className={styles.error}>{failure}</p>}{Object.values(errors).some(Boolean) && <p role="alert" className={styles.srOnly}>Please check the highlighted fields.</p>}
      <div className={styles.formActions}><span>{dirty ? "Unsaved changes" : ""}</span><button type="button" disabled={pending} className={styles.secondary} onClick={() => guard?.leave(() => router.push(event ? `/events/${event.id}` : "/events"))}>Cancel</button><button type="submit" className={styles.primary} disabled={pending || session.status !== "active" || (Boolean(event) && !dirty)} aria-busy={pending}>{pending ? event ? "Saving changes…" : "Creating event…" : event ? "Save changes" : "Create event"}</button></div>
    </form>
  </main>;
}
