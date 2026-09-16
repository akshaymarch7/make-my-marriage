"use client";
import Link from "next/link";
import styles from "@/components/guests/guests.module.css";

export default function GuestsError({ retry }: { retry: () => void }) {
  return <main className={`${styles.page} ${styles.formPage}`}><section className={styles.section}><p className={styles.eyebrow}>Make My Marriage</p><h1>We couldn’t load your guests.</h1><p className={styles.intro}>Please try again in a moment.</p><div className={styles.actionRow}><button className={styles.primary} onClick={retry}>Try again</button><Link href="/dashboard" className={styles.secondary}>Back to dashboard</Link></div></section></main>;
}
