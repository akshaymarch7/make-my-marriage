"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { notifySessionChange } from "@/components/auth/session-events";
import { timeZones } from "./time-zones";
import styles from "./wedding.module.css";
import { OnboardingSessionNotice, useOnboardingSession } from "./onboarding-session";

const initial = { brideName: "", groomName: "", weddingDate: "", location: "", title: "", description: "", timeZone: "Asia/Kolkata" };
type Field = keyof typeof initial;

export function OnboardingForm() {
  const router = useRouter();
  const session = useOnboardingSession();
  const form = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  function update(field: Field, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setFailure("");
  }
  function showErrors(details: Record<string, string | string[]>) {
    const fields: Partial<Record<Field, string>> = {};
    for (const [path, message] of Object.entries(details)) {
      const field = path.split(".")[0] as Field;
      if (field in initial) fields[field] = Array.isArray(message) ? message.join(" ") : message;
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
    if (submitting.current || session.status !== "active") return;
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
      const response = await fetch("/api/wedding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (response.ok || result.error?.code === "ALREADY_HAS_WEDDING") {
        notifySessionChange(); router.replace("/dashboard"); router.refresh(); return;
      }
      if (response.status === 401) {
        session.expire();
      } else if (result.error?.details) showErrors(result.error.details);
      else setFailure("We couldn’t create your wedding. Your details are saved in this form—please try again.");
    } catch { setFailure("We couldn’t connect. Your details are still here. Check your connection and try again."); }
    finally { submitting.current = false; setPending(false); }
  }}>
    <OnboardingSessionNotice/>
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
        {input("title", { maxLength: 220, placeholder: "A title for your celebration" })}{error("title")}
      </div>
      <div><label htmlFor="description">Description <small>(optional)</small></label><textarea id="description" name="description" rows={3} maxLength={1000} value={values.description} placeholder="Share a short note about your celebration…" onChange={event => update("description", event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : undefined}/>{error("description")}</div>
      <div><label htmlFor="timeZone">Time zone</label><select id="timeZone" name="timeZone" value={values.timeZone} onChange={event => update("timeZone", event.target.value)} aria-invalid={Boolean(errors.timeZone)} aria-describedby={errors.timeZone ? "timeZone-error" : undefined}>{timeZones.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{error("timeZone")}</div>
      {failure && <p role="alert" className={styles.saveError}>{failure}</p>}
      {Object.values(errors).some(Boolean) && <p role="alert" className={styles.visuallyHidden}>Please check the highlighted fields.</p>}
      <div className={styles.submitArea}><button type="submit" className={styles.submit} aria-busy={pending}>{pending ? "Creating your wedding…" : failure ? "Retry creating wedding →" : "Create wedding →"}</button><p>You’ll be the Admin of this wedding.</p></div>
    </fieldset>
  </form>;
}
