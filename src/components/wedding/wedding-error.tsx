"use client";
import Link from "next/link";
import styles from "./wedding.module.css";

export function WeddingError({ reset }: { reset: () => void }) {
  return <main className={styles.errorPage}><section className={styles.formCard}><p className={styles.eyebrow}>Make My Marriage</p><h1>We couldn’t load your wedding.</h1><p className={styles.intro}>Please try again in a moment.</p><button className={styles.submit} onClick={reset}>Try again</button><Link href="/" className={styles.backHome}>Back to the homepage</Link></section></main>;
}
