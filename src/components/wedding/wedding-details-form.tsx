"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { notifySessionChange } from "@/components/auth/session-events";
import { useUnsavedChanges } from "./unsaved-changes";
import type { UpdateWeddingInput } from "@/modules/weddings/schemas";
import { timeZones } from "./time-zones";
import styles from "./wedding.module.css";
import { WeddingDraftNotice, useWeddingDraftSession } from "./draft-session";

const initial = { brideName: "", groomName: "", weddingDate: "", location: "", title: "", description: "", timeZone: "Asia/Kolkata" };
export type WeddingFormValues = typeof initial;
type Field = keyof WeddingFormValues;

export function WeddingDetailsForm({ initialValues }: { initialValues?: WeddingFormValues }) {
  const editing = initialValues !== undefined;
  const baseline = useRef(initialValues ?? initial);
  const guard = useUnsavedChanges();
  const router = useRouter();
  const session = useWeddingDraftSession();
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const [values, setValues] = useState(baseline.current);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  const dirty = (Object.keys(initial) as Field[]).some(field => values[field] !== baseline.current[field]);
  const setDirty = guard?.setDirty;
  const setBusy = guard?.setBusy;
  useEffect(() => { setBusy?.(pending); return () => setBusy?.(false); }, [pending, setBusy]);
  useEffect(() => { setDirty?.(dirty); return () => setDirty?.(false); }, [dirty, setDirty]);

  function update(field: Field, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setFailure("");
  }
  function showErrors(details: Record<string, string | string[]>) {
    const fields: Partial<Record<Field, string>> = {};
    for (const [path, message] of Object.entries(details)) {
      const field = path.split(".")[0] as Field;
      if (Object.hasOwn(initial, field)) fields[field] = Array.isArray(message) ? message.join(" ") : message;
    }
    setErrors(fields);
    const field = Object.keys(fields)[0];
    if (field) requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus());
    else setFailure("Please check your wedding details and try again.");
  }
  function input(field: Field, options: { type?: string; placeholder?: string; maxLength?: number; required?: boolean } = {}) {
    return <input id={field} name={field} value={values[field]} onChange={event => update(field, event.target.value)}
      type={options.type ?? "text"} placeholder={options.placeholder} maxLength={options.maxLength} required={options.required}
      aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}/>;
  }
  function error(field: Field) { return errors[field] ? <p id={`${field}-error`} className={styles.fieldError}>{errors[field]}</p> : null; }

  return <form ref={form} className={styles.form} noValidate onSubmit={async event => {
    event.preventDefault();
    if (submitting.current || session.status !== "active" || (editing && !dirty)) return;
    setFailure(""); setErrors({});
    const parsed = createWeddingSchema.safeParse({ ...values, location: { formattedAddress: values.location } });
    if (!parsed.success) {
      const details: Record<string, string> = {};
      for (const issue of parsed.error.issues) details[issue.path.join(".")] = issue.message;
      showErrors(details); return;
    }
    submitting.current = true; setPending(true);
    try {
      // Recheck the account before sending a draft after a tab/account switch.
      if (!await session.revalidate()) return;
      const changes: UpdateWeddingInput = {};
      for (const field of Object.keys(initial) as Field[]) {
        if (values[field] === baseline.current[field]) continue;
        if (field === "location") {
          // A new manual location invalidates old structured place metadata.
          changes.location = { formattedAddress: values.location.trim(), city: "", state: "", country: "", latitude: null, longitude: null, googlePlaceId: "" };
        } else changes[field] = parsed.data[field];
      }
      const response = await fetch("/api/wedding", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? changes : parsed.data) });
      const result = await response.json();
      if (response.ok || (!editing && result.error?.code === "ALREADY_HAS_WEDDING")) {
        guard?.setDirty(false);
        notifySessionChange(); router.replace(editing ? "/dashboard?updated=1" : "/dashboard"); router.refresh(); return;
      }
      if (response.status === 401) {
        session.expire();
      } else if (result.error?.details) showErrors(result.error.details);
      else setFailure(editing ? "We couldn’t save your changes. Your details are still here—please try again." : "We couldn’t create your wedding. Your details are saved in this form—please try again.");
    } catch { setFailure("We couldn’t connect. Your details are still here. Check your connection and try again."); }
    finally { submitting.current = false; setPending(false); }
  }}>
    <WeddingDraftNotice/>
    <fieldset disabled={pending || session.status !== "active"}>
      <div className={styles.formPair}>
        <div><label htmlFor="brideName">Bride’s name <span>*</span></label>{input("brideName", { required: true, maxLength: 100, placeholder: "First and last name" })}{error("brideName")}</div>
        <div><label htmlFor="groomName">Groom’s name <span>*</span></label>{input("groomName", { required: true, maxLength: 100, placeholder: "First and last name" })}{error("groomName")}</div>
      </div>
      <div className={styles.formPair}>
        <div><label htmlFor="weddingDate">Wedding date <span>*</span></label>{input("weddingDate", { required: true, type: "date" })}{error("weddingDate")}</div>
        <div><label htmlFor="location">Wedding city / location <span>*</span></label>{input("location", { required: true, maxLength: 300, placeholder: "e.g. Udaipur, Rajasthan" })}{error("location")}</div>
      </div>
      <div>
        <div className={styles.titleLabel}><label htmlFor="title">Wedding title <small>(optional)</small></label><button type="button" className={styles.suggest} disabled={!values.brideName.trim() || !values.groomName.trim()} onClick={() => update("title", `The Wedding of ${values.brideName.trim()} & ${values.groomName.trim()}`)}>✧ Suggest from names</button></div>
        {input("title", { maxLength: 220, placeholder: "A title for your celebration" })}{editing && values.title && <button type="button" className={styles.suggest} onClick={() => update("title", "")}>Clear title</button>}{error("title")}
      </div>
      <div><label htmlFor="description">Description <small>(optional)</small></label><textarea id="description" name="description" rows={3} maxLength={1000} value={values.description} placeholder="Share a short note about your celebration…" onChange={event => update("description", event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{editing && values.description && <button type="button" className={styles.suggest} onClick={() => update("description", "")}>Clear description</button>}{error("description")}</div>
      <div><label htmlFor="timeZone">Time zone</label><select id="timeZone" name="timeZone" value={values.timeZone} onChange={event => update("timeZone", event.target.value)} aria-invalid={Boolean(errors.timeZone)} aria-describedby={errors.timeZone ? "timeZone-error" : undefined}>{!timeZones.some(([value]) => value === values.timeZone) && <option value={values.timeZone}>{values.timeZone}</option>}{timeZones.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{error("timeZone")}</div>
      {failure && <p role="alert" className={styles.saveError}>{failure}</p>}
      {Object.values(errors).some(Boolean) && <p role="alert" className={styles.visuallyHidden}>Please check the highlighted fields.</p>}
    </fieldset>
    <div className={`${styles.submitArea} ${editing ? styles.editActions : ""}`}>
      {editing && <><span>{dirty ? "Unsaved changes" : "No unsaved changes"}</span><button type="button" className={styles.secondary} disabled={pending} onClick={() => guard?.leave(() => router.push("/dashboard"))}>Cancel</button></>}
      <button type="submit" className={styles.submit} disabled={pending || session.status !== "active" || (editing && !dirty)} aria-busy={pending}>{pending ? editing ? "Saving changes…" : "Creating your wedding…" : editing ? "Save changes" : failure ? "Retry creating wedding →" : "Create wedding →"}</button>
      {!editing && <p>You’ll be the Admin of this wedding.</p>}
    </div>
  </form>;
}
