"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/home/icon";
import { eventTimeRange } from "@/modules/events/dates";
import { weddingDateLabel } from "@/modules/weddings/dates";
import { notifySessionChange, watchSessionChanges } from "@/components/auth/session-events";
import { rsvpInputSchema, rsvpResultSchema, type PublicInvitation } from "@/modules/guests/invitation-schemas";
import styles from "./invitation.module.css";
export function InvitationUnavailable({ retry }: { retry?: () => void }) {
  return <div className={styles.publicPage}><PublicHeader/><main className={styles.unavailable}><span className={styles.seal}><Icon name={retry ? "globe" : "heart"} size={28}/></span><p className={styles.eyebrow}>Invitation access</p><h1>{retry ? "We couldn’t load your invitation right now." : "This invitation is unavailable."}</h1><p>{retry ? "Please try again in a moment." : "Please contact the couple or the person who shared this link."}</p>{retry && <button className={styles.primary} onClick={retry}>Try again</button>}</main><PublicFooter/></div>;
}
function PublicHeader() { return <header className={styles.publicHeader}><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage" width={174} height={44}/><span>Personal invitation</span></header>; }
function PublicFooter() { return <footer className={styles.publicFooter}><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage" width={155} height={40}/><p>A shared space for your celebration.</p><small>Shared privately with you and your family.</small></footer>; }
export function PublicInvitationPage({ initial, token }: { initial: PublicInvitation; token: string }) {
  const [invitation, setInvitation] = useState(initial), [editing, setEditing] = useState(initial.guest.rsvpStatus === "PENDING");
  const [selection, setSelection] = useState(initial.guest.rsvpStatus === "PENDING" ? "" : initial.guest.rsvpStatus), [count, setCount] = useState(String(initial.guest.attendingCount || 1));
  const [pending, setPending] = useState(false), [failure, setFailure] = useState(""), [notice, setNotice] = useState(""), [unavailable, setUnavailable] = useState(false);
  const revision = useRef(0);
  const busy = useRef(false), form = useRef<HTMLFormElement>(null), banner = useRef<HTMLDivElement>(null);
  const endpoint = `/api/public/invitations/${encodeURIComponent(token)}`;
  useEffect(() => {
    let request: AbortController | undefined;
    const refresh = async () => {
      if (busy.current) return;
      request?.abort(); request = new AbortController(); const signal = request.signal; const started = revision.current;
      try { const response = await fetch(endpoint, { cache: "no-store", signal }); const result = await response.json(); if (signal.aborted || started !== revision.current) return; if (response.status === 404) setUnavailable(true); else if (response.ok && result?.data?.guest && Array.isArray(result.data.events)) setInvitation(result.data); } catch { /* Keep the visible invitation and draft while offline. */ }
    };
    const stop = watchSessionChanges(() => { void refresh(); });
    return () => { request?.abort(); stop(); };
  }, [endpoint]);
  const guest = invitation.guest, wedding = invitation.wedding;
  function openForm() {
    if (!editing) { setSelection(guest.rsvpStatus === "PENDING" ? "" : guest.rsvpStatus); setCount(String(guest.attendingCount || 1)); }
    setEditing(true); setFailure(""); requestAnimationFrame(() => { form.current?.scrollIntoView({ behavior: "smooth", block: "start" }); form.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); });
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current) return; setFailure(""); setNotice("");
    if (!selection) { setFailure("Please let us know whether you’ll be attending."); return; }
    const parsed = rsvpInputSchema.safeParse({ status: selection, attendingCount: selection === "NOT_ATTENDING" ? 0 : guest.maxGuests === 1 ? 1 : Number(count) });
    if (!parsed.success) { setFailure("Please choose a valid whole number of people attending."); return; }
    if (parsed.data.attendingCount > guest.maxGuests) { setFailure(`Your invitation allows up to ${guest.maxGuests} people. Please update your headcount.`); return; }
    revision.current += 1; busy.current = true; setPending(true);
    try {
      const response = await fetch(`${endpoint}/rsvp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => null);
      if (response.status === 404) { setUnavailable(true); return; }
      const saved = rsvpResultSchema.safeParse(result?.data);
      if (response.ok && saved.success) {
        setInvitation(old => ({ ...old, guest: { ...old.guest, rsvpStatus: saved.data.status, attendingCount: saved.data.attendingCount } }));
        setEditing(false); setNotice(guest.rsvpStatus === "PENDING" ? "Your RSVP is confirmed." : "Your response has been updated."); notifySessionChange();
        requestAnimationFrame(() => { banner.current?.scrollIntoView({ behavior: "smooth", block: "center" }); banner.current?.focus({ preventScroll: true }); }); return;
      }
      setFailure(result?.error?.message || "We couldn’t save your response. Your selection is still here. Please try again.");
      if (response.status === 409 || result?.error?.code === "PARTY_SIZE_CHANGED") {
        const refreshed = await fetch(endpoint, { cache: "no-store" }); const latest = await refreshed.json();
        if (refreshed.status === 404) setUnavailable(true); else if (refreshed.ok && latest?.data?.guest) setInvitation(latest.data);
      }
    } catch { setFailure("We couldn’t save your response. Your selection is still here. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  if (unavailable) return <InvitationUnavailable/>;
  return <div className={styles.publicPage}><PublicHeader/><main>
    <section className={styles.hero}><span className={styles.seal}><Icon name="heart" size={28}/></span><p className={styles.eyebrow}>Personal invitation</p><p className={styles.forGuest}>An invitation for {guest.name}</p><h1>{wedding.brideName} <em>&amp;</em> {wedding.groomName}</h1><p className={styles.welcome}>“Together with our families, we would love for you to celebrate with us as we embark on this journey of love and union.”</p><div className={styles.heroMeta}><span><Icon name="calendar" size={15}/>{weddingDateLabel(wedding.weddingDate)}</span>{wedding.location && <span><Icon name="location" size={15}/>{wedding.location}</span>}</div><div className={styles.heroImage}><Image src="/images/invitation-floral-arch.jpg" alt="Decorative floral wedding arch" fill sizes="(max-width: 700px) 100vw, 1000px" priority/><div className={styles.imageCaption}><p className={styles.eyebrow}>A celebration of love</p><h2>{wedding.title || "Together in celebration"}</h2>{wedding.location && <span>{wedding.location}</span>}</div></div></section>
    <section className={styles.statusWrap}><div className={styles.statusCard} ref={banner} tabIndex={-1}><div><p className={styles.eyebrow}><Icon name={guest.rsvpStatus === "ATTENDING" ? "check" : "heart"} size={14}/>RSVP status: {guest.rsvpStatus === "PENDING" ? "Pending" : guest.rsvpStatus === "ATTENDING" ? "Confirmed attending" : "Unable to attend"}</p><h2>{guest.rsvpStatus === "PENDING" ? "Will you be joining us?" : guest.rsvpStatus === "ATTENDING" ? "We look forward to celebrating with you!" : "You will be missed warmly"}</h2><p>{guest.rsvpStatus === "PENDING" ? "Please let us know your attendance plans for you and your family." : guest.rsvpStatus === "ATTENDING" ? `${guest.name} · Attending: ${guest.attendingCount} ${guest.attendingCount === 1 ? "person" : "people"}.` : `Thank you for letting us know. ${guest.name} · Not attending.`}</p><small>{guest.rsvpStatus === "NOT_ATTENDING" ? "You’ll be with us in spirit. " : ""}Your response applies to your whole invitation. You can update it using this same link.</small>{notice && <p role="status" className={styles.success}>{notice}</p>}</div><div className={styles.statusAction}><button className={guest.rsvpStatus === "PENDING" ? styles.primary : styles.secondary} onClick={openForm} disabled={pending}>{guest.rsvpStatus === "PENDING" ? "Respond to invitation" : "Update response"}<Icon name="arrow" size={16}/></button><small>Reserved for up to {guest.maxGuests} {guest.maxGuests === 1 ? "person" : "people"}</small></div></div></section>
    <section className={styles.itinerary}><div className={styles.sectionHeading}><p className={styles.eyebrow}>Your personal schedule</p><h2>Celebration Itinerary</h2><span className={styles.goldLine}/><p className={styles.zone}>All ceremony schedules are displayed in <strong>{wedding.timeZone}</strong></p><p>Only ceremonies designated for {guest.name} are displayed below.</p></div><div className={styles.eventTimeline}>{invitation.events.map((event, index) => { const date = new Intl.DateTimeFormat("en-IN", { timeZone: wedding.timeZone, day: "2-digit", month: "short", year: "numeric" }).formatToParts(new Date(event.startsAt)); const part = (type: string) => date.find(p => p.type === type)?.value; return <article className={styles.eventCard} key={`${index}:${event.startsAt}`}><div className={styles.dateTile}><small>Celebration {String(index + 1).padStart(2, "0")}</small><strong>{part("day")}</strong><span>{part("month")} {part("year")}</span></div><div className={styles.eventBody}><p className={styles.eyebrow}>You’re invited</p><h3>{event.name}</h3><div className={styles.eventMeta}><p><Icon name="calendar" size={16}/>{eventTimeRange(event.startsAt, event.endsAt, wedding.timeZone)}</p>{event.venueName && <p><Icon name="location" size={16}/>{event.venueName}</p>}{event.address && <p className={styles.address}>{event.address}</p>}</div>{event.description && <p className={styles.eventDescription}>{event.description}</p>}{event.dressCode && <div className={styles.attire}><Icon name="sparkle" size={18}/><div><span>Dress code</span><p>{event.dressCode}</p></div></div>}</div></article>; })}{!invitation.events.length && <div className={styles.empty}>Event details will appear here when available.</div>}</div></section>
    {editing && <section className={styles.formWrap}><form ref={form} onSubmit={submit} noValidate className={styles.rsvpForm}><div className={styles.formHeading}><div><p className={styles.eyebrow}>Guest response portal</p><h2>Formal RSVP</h2></div><span>Private invitation for<br/><strong>{guest.name}</strong></span></div><fieldset disabled={pending}><legend>Will {guest.name} be joining us?</legend><div className={styles.choiceGrid}><label className={selection === "ATTENDING" ? styles.selectedChoice : styles.choice}><input type="radio" name="attendance" value="ATTENDING" checked={selection === "ATTENDING"} onChange={() => { setSelection("ATTENDING"); setFailure(""); }}/><span><strong>Yes, joyfully accepting!</strong><small>We’re excited to celebrate with you.</small></span></label><label className={selection === "NOT_ATTENDING" ? styles.selectedChoice : styles.choice}><input type="radio" name="attendance" value="NOT_ATTENDING" checked={selection === "NOT_ATTENDING"} onChange={() => { setSelection("NOT_ATTENDING"); setFailure(""); }}/><span><strong>Regretfully declining</strong><small>We will celebrate with you in spirit.</small></span></label></div>{selection === "ATTENDING" && <div className={styles.headcount}><label htmlFor="attending-count">Total number attending</label>{guest.maxGuests === 1 ? <input id="attending-count" type="number" value="1" readOnly aria-describedby="party-size-hint"/> : guest.maxGuests > 20 ? <input id="attending-count" type="number" min={1} max={guest.maxGuests} step={1} value={count} onChange={e => { setCount(e.target.value); setFailure(""); }} aria-describedby="party-size-hint"/> : <select id="attending-count" value={count} onChange={e => { setCount(e.target.value); setFailure(""); }} aria-describedby="party-size-hint">{Number(count) > guest.maxGuests && <option value={count}>{count} — exceeds current party size</option>}{Array.from({ length: guest.maxGuests }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? "people" : "person"}</option>)}</select>}<p id="party-size-hint">Includes the named guest. Your invitation allows up to {guest.maxGuests} {guest.maxGuests === 1 ? "person" : "people"}.</p></div>}</fieldset><p className={styles.formHint}>Your response applies to your invitation. You can update it later using this same link.</p>{failure && <p role="alert" className={styles.error}>{failure}</p>}<div className={styles.formBottom}><span>Shared privately with the wedding team.</span><div>{guest.rsvpStatus !== "PENDING" && <button type="button" className={styles.secondary} disabled={pending} onClick={() => { setEditing(false); setFailure(""); }}>Cancel</button>}<button className={styles.primary} disabled={pending} aria-busy={pending}>{pending ? "Saving your response…" : guest.rsvpStatus === "PENDING" ? "Send RSVP" : "Save changes"}<Icon name="arrow" size={16}/></button></div></div></form></section>}
  </main><PublicFooter/></div>;
}
