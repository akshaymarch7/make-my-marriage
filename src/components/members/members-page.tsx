"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { watchSessionChanges } from "@/components/auth/session-events";
import { inviteMemberSchema } from "@/modules/memberships/schemas";
import type { listMembers, listInvitations } from "@/modules/memberships/service";
import styles from "./members.module.css";
import { MemberActions } from "./member-actions";

type Member = Awaited<ReturnType<typeof listMembers>>[number];
type Invitation = Awaited<ReturnType<typeof listInvitations>>[number];
async function readResult(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "We couldn’t complete that request. Please try again.");
  return result.data;
}
export function MembersPage({ userId }: { userId: string }) {
  const [data, setData] = useState<{ members: Member[]; invitations: Invitation[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const inviteDialog = useRef<HTMLDialogElement>(null);
  const revokeDialog = useRef<HTMLDialogElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort(); controller = new AbortController(); const request = controller;
      try {
        const [members, invitations] = await Promise.all([
          fetch("/api/members", { cache: "no-store", signal: request.signal }).then(readResult),
          fetch("/api/members/invitations", { cache: "no-store", signal: request.signal }).then(readResult),
        ]);
        if (!request.signal.aborted) { setData({ members, invitations }); setLoadError(""); }
      } catch (failure) {
        if (!request.signal.aborted) setLoadError(failure instanceof Error ? failure.message : "We couldn’t load wedding members.");
      }
    };
    void load(); const stop = watchSessionChanges(() => { void load(); });
    return () => { stop(); controller?.abort(); };
  }, [attempt, userId]);
  function openInvite() { setEmail(""); setRole("MANAGER"); setError(""); setFieldError(""); inviteDialog.current?.showModal(); }
  return <main id="wedding-content" className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Back to your wedding</Link>
    <div className={styles.heading}><div><p className={styles.eyebrow}>Settings / Wedding members</p><h1>Wedding members</h1><p>Invite the people helping you plan your celebration.</p></div><button className={styles.primary} onClick={openInvite}>＋ Invite member</button></div>
    {notice && <p role="status" className={styles.success}>{notice}</p>}
    {loadError && <div role="alert" className={styles.error}><p>{loadError}</p><button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {!data && !loadError && <p role="status" className={styles.card}>Loading wedding members…</p>}
    {data && <>
      <section className={styles.card} aria-labelledby="members-title"><div className={styles.sectionHeading}><div><h2 id="members-title">Current wedding members</h2><p>The people planning your celebration together.</p></div><span className={styles.count}>{data.members.length} {data.members.length === 1 ? "member" : "members"}</span></div>
        <ul className={styles.list}>{data.members.map(member => <li key={member.membershipId}><span className={styles.avatar} aria-hidden="true">{member.user.name.slice(0, 1)}</span><div className={styles.person}><strong>{member.user.name} {member.user.id === userId && <span className={styles.you}>You</span>}</strong><span>{member.user.email}</span></div><span className={styles.badge}>{member.role === "ADMIN" ? "Admin" : "Manager"}</span><MemberActions member={member} userId={userId} lastAdmin={member.role === "ADMIN" && data.members.filter(row => row.role === "ADMIN").length === 1} onSaved={message => { setNotice(message); setAttempt(value => value + 1); }}/></li>)}</ul><p className={styles.hint}>Your wedding must always have at least one Admin. Make another member an Admin before removing or changing the role of the last Admin.</p>
      </section>
      <section className={styles.card} aria-labelledby="pending-title"><div className={styles.sectionHeading}><div><h2 id="pending-title">Pending invitations</h2><p>Invitations sent to your wedding’s helping hands.</p></div><span className={styles.count}>{data.invitations.length} pending</span></div>
        {data.invitations.length ? <ul className={styles.list}>{data.invitations.map(invitation => <li key={invitation.id}><span className={`${styles.avatar} ${styles.gold}`} aria-hidden="true">✉</span><div className={styles.person}><strong>{invitation.email} <span className={styles.badge}>{invitation.role === "ADMIN" ? "Admin" : "Manager"}</span></strong><span>Expires {new Date(invitation.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div><button className={styles.smallButton} onClick={() => { setRevoking(invitation); setError(""); revokeDialog.current?.showModal(); }}>Revoke invitation<span className={styles.srOnly}> for {invitation.email}</span></button></li>)}</ul> : <div className={styles.empty}><span aria-hidden="true">✉</span><h3>No pending invitations</h3><p>Invite someone you trust to help plan your wedding.</p><button className={styles.secondary} onClick={openInvite}>Invite member</button></div>}
      </section>
      <aside className={styles.guidelines}><h2>Role guidelines</h2><p><strong>Manager:</strong> Helps manage wedding planning.</p><p><strong>Admin:</strong> Can also invite people and manage wedding members.</p></aside>
    </>}
    <dialog ref={inviteDialog} className={styles.dialog} aria-labelledby="invite-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <p className={styles.eyebrow}>Bring your people together</p><h2 id="invite-title">Invite wedding member</h2><p className={styles.muted}>Send a personal invitation to join your wedding workspace.</p>
      <form className={styles.form} noValidate onSubmit={async event => {
        event.preventDefault(); if (pending) return;
        const parsed = inviteMemberSchema.safeParse({ email, role });
        if (!parsed.success) { setFieldError(parsed.error.issues[0].message); emailInput.current?.focus(); return; }
        setPending(true); setError(""); setFieldError("");
        try {
          await readResult(await fetch("/api/members/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }));
          inviteDialog.current?.close(); setNotice(`Invitation email sent to ${parsed.data.email}.`); setAttempt(value => value + 1);
        } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t send the invitation. Please try again."); }
        finally { setPending(false); }
      }}>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <label htmlFor="invite-email">Email address</label><input ref={emailInput} id="invite-email" autoFocus type="email" autoComplete="email" value={email} maxLength={254} required disabled={pending} aria-invalid={!!fieldError} aria-describedby={fieldError ? "invite-email-error" : "invite-email-hint"} onChange={event => { setEmail(event.target.value); setFieldError(""); }}/>
        <p id="invite-email-hint" className={styles.hint}>They must sign in with this email address to accept.</p>{fieldError && <p id="invite-email-error" role="alert" className={styles.fieldError}>{fieldError}</p>}
        <fieldset disabled={pending}><legend>Wedding role</legend>{(["MANAGER", "ADMIN"] as const).map(value => <label className={styles.roleChoice} key={value}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)}/><span><strong>{value === "ADMIN" ? "Admin" : "Manager"}</strong><small>{value === "ADMIN" ? "Can also invite people and manage wedding members." : "Helps manage wedding planning."}</small></span></label>)}</fieldset>
        <div className={styles.actions}><button className={styles.secondary} type="button" disabled={pending} onClick={() => inviteDialog.current?.close()}>Cancel</button><button className={styles.primary} type="submit" disabled={pending}>{pending ? "Sending invitation…" : "Send invitation"}</button></div>
      </form>
    </dialog>
    <dialog ref={revokeDialog} className={styles.dialog} aria-labelledby="revoke-title" onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id="revoke-title">Revoke wedding invitation?</h2><p className={styles.email}>{revoking?.email}</p><p className={styles.muted}>Revoking this invitation will prevent this link from being used to join your wedding.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button className={styles.secondary} autoFocus disabled={pending} onClick={() => revokeDialog.current?.close()}>Keep invitation</button><button className={styles.primary} disabled={pending} onClick={async () => {
        if (!revoking || pending) return; setPending(true); setError("");
        try {
          const response = await fetch(`/api/members/invitations/${revoking.id}`, { method: "DELETE" });
          if (!response.ok) await readResult(response);
          revokeDialog.current?.close(); setNotice(`Invitation to ${revoking.email} revoked.`); setAttempt(value => value + 1);
        } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t revoke the invitation. Please try again."); }
        finally { setPending(false); }
      }}>{pending ? "Revoking…" : "Revoke invitation"}</button></div>
    </dialog>
  </main>;
}
