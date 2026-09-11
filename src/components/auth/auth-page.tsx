import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "./auth-form";
import styles from "./auth.module.css";

export function AuthPage({ mode, returnTo, invitedEmail }: { mode: "signup" | "login"; returnTo?: string; invitedEmail?: string }) {
  const signup = mode === "signup";
  return <main className={styles.page}>
    <section className={styles.content}>
      <Link href="/" aria-label="Make My Marriage home"><Image src="/images/make-my-marriage-logo.svg" width={240} height={60} alt="Make My Marriage" priority/></Link>
      <div className={styles.inner}><p className={styles.eyebrow}>A beautiful beginning</p><h1>{returnTo ? signup ? "Create your account\nto join the celebration." : "Sign in to join\nthe celebration." : signup ? "Your forever,\nstarts here." : "Welcome back\nto your big day."}</h1><p className={styles.subtitle}>{returnTo ? `Use the email address your invitation was sent to. You’ll return to your invitation after ${signup ? "creating your account" : "signing in"}.` : signup ? "Create your account and take the first step towards a celebration that’s truly yours." : "Sign in to your Make My Marriage account. We’re happy to see you again."}</p><AuthForm mode={mode} returnTo={returnTo} invitedEmail={invitedEmail}/></div>
      <Link className={styles.back} href="/">← Back to the homepage</Link>
    </section>
    <aside className={styles.story}><div className={styles.photo}><Image src="/images/wedding-celebration.jpg" alt="A wedding celebration filled with flowers and warm light" fill sizes="(max-width: 800px) 100vw, 50vw" priority/></div><div className={styles.storyText}><span>MADE FOR YOUR HAPPILY EVER AFTER</span><h2>A little less planning.<br/>A lot more celebrating.</h2><p>One beautiful place for the people, moments, and details that make your wedding yours.</p></div></aside>
  </main>;
}
