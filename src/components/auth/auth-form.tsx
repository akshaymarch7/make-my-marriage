"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import { notifySessionChange } from "./session-events";
import { useUnsavedChanges } from "@/components/wedding/unsaved-changes";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  return <form className={styles.form} onSubmit={async event => {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)) });
      const result = await response.json();
      if (!response.ok) {
        const details = result.error?.details;
        setError(details ? Object.values(details).flat().join(" ") : result.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      notifySessionChange();
      router.replace(result.data.hasWedding ? "/dashboard" : "/onboarding"); router.refresh();
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setPending(false); }
  }}>
    {signup && <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your full name" disabled={pending}/></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" disabled={pending}/></label>
    <label>Password<span className={styles.password}><input name="password" type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={128} aria-describedby={signup ? "password-hint" : undefined} disabled={pending}/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>{visible ? "Hide" : "Show"}</button></span></label>
    {signup && <p id="password-hint" className={styles.hint}>Use at least 12 characters. Spaces are welcome.</p>}
    <div role="alert" className={styles.error}>{error}</div>
    <button className={styles.primary} disabled={pending} type="submit">{pending ? "One moment…" : signup ? "Create your account →" : "Sign in →"}</button>
    <p className={styles.switch}>{signup ? "Already have an account?" : "New to Make My Marriage?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const guard = useUnsavedChanges();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const signOut = async () => {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok || response.status === 401) { notifySessionChange(); router.replace("/login"); router.refresh(); }
      else setError("We couldn’t sign you out. Please try again.");
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setPending(false); }
  };
  return <div><button className={className ?? styles.primary} disabled={pending} onClick={() => guard ? guard.leave(() => { void signOut(); }) : void signOut()}>{pending ? "Signing out…" : "Sign out"}</button><p role="alert" className={styles.error}>{error}</p></div>;
}
