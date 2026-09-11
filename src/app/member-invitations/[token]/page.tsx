import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { AcceptInvitation } from "@/components/members/accept-invitation";
import { invitationTokenSchema } from "@/modules/memberships/schemas";
import styles from "@/components/members/members.module.css";

export const metadata = { title: "Wedding invitation", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const route = z.object({ token: invitationTokenSchema }).strict().safeParse(await params);
  const query = z.object({}).strict().safeParse(await searchParams);
  return <div className={styles.publicShell}><header className={styles.publicHeader}><Link href="/" aria-label="Make My Marriage home"><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage" width={220} height={55} priority/></Link></header><main className={styles.acceptMain}>
    {route.success && query.success ? <AcceptInvitation key={route.data.token} token={route.data.token}/> : <section className={styles.acceptCard}><h1>Invitation unavailable</h1><p>Ask the wedding Admin for a new invitation.</p></section>}
  </main><footer className={styles.publicFooter}>© {new Date().getFullYear()} Make My Marriage. All rights reserved.</footer></div>;
}
