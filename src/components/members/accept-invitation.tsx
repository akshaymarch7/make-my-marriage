"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifySessionChange, watchSessionChanges } from "@/components/auth/session-events";
import { WeddingArch } from "@/components/wedding/arch";
import { weddingDateLabel } from "@/modules/weddings/dates";
import type { getPublicInvitation } from "@/modules/memberships/service";
import styles from "./members.module.css";

type Invitation = Awaited<ReturnType<typeof getPublicInvitation>>;
type Account = { user: { id: string; email: string }; wedding: { id: string } | null };
type Failure = { code: string; message: string };
const terminalCodes = ["INVALID_TOKEN", "TOKEN_EXPIRED", "INVITATION_ALREADY_ACCEPTED", "VALIDATION_ERROR"];
export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ invitation: Invitation; account: Account | null } | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const accepted = useRef(false);
  const returnTo = `/member-invitations/${token}`;
  const loginUrl = `/login?next=${encodeURIComponent(returnTo)}`;
  useEffect(() => {
    let controller: AbortController | undefined;
    const check = async () => {
      if (accepted.current) return;
      controller?.abort(); controller = new AbortController(); const request = controller;
      try {
        const [invitationResponse, accountResponse] = await Promise.all([
          fetch(`/api/public/member-invitations/${token}`, { cache: "no-store", signal: request.signal }),
          fetch("/api/auth/me", { cache: "no-store", signal: request.signal }),
        ]);
        const result = await invitationResponse.json();
        if (request.signal.aborted || accepted.current) return;
        if (!invitationResponse.ok) { setData(null); setError(result.error); return; }
        if (!accountResponse.ok && accountResponse.status !== 401) throw new Error("Session unavailable");
        const account = accountResponse.ok ? (await accountResponse.json()).data : null;
        if (!request.signal.aborted && !accepted.current) { setData({ invitation: result.data, account }); setError(null); }
      } catch {
        if (!request.signal.aborted && !accepted.current) setError({ code: "NETWORK_ERROR", message: "We couldn’t check your invitation and account. Please try again." });
      }
    };
    void check(); const stop = watchSessionChanges(() => { void check(); });
    return () => { stop(); controller?.abort(); };
  }, [token, attempt]);
  const invitation = data?.invitation;
  const account = data?.account;
  const mismatch = account && invitation && account.user.email.trim().toLowerCase() !== invitation.email.toLowerCase();
  const terminal = error && terminalCodes.includes(error.code);
  return <section className={styles.acceptCard} aria-label="Wedding invitation">
    <div className={styles.arch}><WeddingArch compact/></div>
    <p className={styles.eyebrow}>Wedding workspace invitation</p>
    {success ? <><h1>You’re part of the celebration</h1><p role="status" className={styles.success}>Invitation accepted. Welcome to the wedding workspace.</p><Link className={styles.primary} href="/dashboard">Go to your wedding</Link></> : <>
      {!data && !error && <p role="status">Loading your invitation…</p>}
      {terminal ? <><h1>{error.code === "TOKEN_EXPIRED" ? "Invitation expired" : error.code === "INVITATION_ALREADY_ACCEPTED" ? "Invitation already accepted" : "Invitation unavailable"}</h1><p className={styles.muted}>{error.message}</p>{error.code === "INVITATION_ALREADY_ACCEPTED" ? <Link className={styles.secondary} href="/welcome">Go to your wedding</Link> : <p className={styles.hint}>Ask the wedding Admin for a new invitation.</p>}</> : <>
        {invitation && <><h1>{invitation.wedding.brideName} &amp; {invitation.wedding.groomName}</h1><p className={styles.hint}>{weddingDateLabel(invitation.wedding.weddingDate)}</p><dl className={styles.invitationDetails}><div><dt>Invited email</dt><dd>{invitation.email}</dd></div><div><dt>Assigned role</dt><dd><span className={styles.badge}>{invitation.role === "ADMIN" ? "Admin" : "Manager"}</span></dd></div></dl><p className={styles.muted}>You’ve been invited to help plan this celebration in a shared wedding workspace.</p></>}
        {error && <div className={styles.error} role="alert"><p>{error.message}</p><button className={styles.secondary} disabled={pending} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
        {data && !error && <div className={styles.acceptActions}>
          {!account ? <><p className={styles.hint}>Sign in or create an account using {invitation?.email} to accept this invitation.</p><Link className={styles.primary} href={`/signup?next=${encodeURIComponent(returnTo)}`}>Create an account to join</Link><p className={styles.hint}>Already have an account? <Link href={loginUrl}>Sign in</Link></p></> : mismatch ? <><p className={styles.error}>You’re signed in as {account.user.email}. Use {invitation?.email} to accept this invitation.</p><button className={styles.primary} disabled={pending} onClick={async () => {
            if (pending) return; setPending(true);
            try {
              const response = await fetch("/api/auth/logout", { method: "POST" });
              if (!response.ok && response.status !== 401) throw new Error("Sign out failed");
              notifySessionChange(); router.replace(loginUrl); router.refresh();
            } catch { setError({ code: "NETWORK_ERROR", message: "We couldn’t sign you out. Please try again." }); }
            finally { setPending(false); }
          }}>{pending ? "Signing out…" : "Sign in with the invited email"}</button></> : account.wedding ? <><p className={styles.error}>Your account already belongs to a wedding. One account can belong to only one wedding.</p><Link className={styles.primary} href="/dashboard">Go to your wedding</Link></> : <><p className={styles.hint}>Signed in as {account.user.email}</p><button className={styles.primary} disabled={pending} onClick={async () => {
            if (pending) return; setPending(true);
            try {
              const response = await fetch(`/api/member-invitations/${token}/accept`, { method: "POST" });
              const result = await response.json();
              if (!response.ok) { setError(result.error); return; }
              accepted.current = true; setSuccess(true); notifySessionChange();
            } catch { setError({ code: "NETWORK_ERROR", message: "We couldn’t confirm acceptance. Try again to check the invitation’s status." }); }
            finally { setPending(false); }
          }}>{pending ? "Accepting invitation…" : "Accept invitation"}</button></>}
        </div>}
      </>}
    </>}
  </section>;
}
