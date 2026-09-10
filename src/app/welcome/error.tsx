"use client";
import styles from "@/components/auth/auth.module.css";
export default function WelcomeError({ reset }: { reset: () => void }) {
  return <main className={styles.welcome}><section className={styles.welcomeCard}><h1>We couldn’t load your account.</h1><p>Please try again in a moment.</p><button className={styles.primary} onClick={reset}>Try again</button></section></main>;
}
