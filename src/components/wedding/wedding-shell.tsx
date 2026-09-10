import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/auth-form";
import { SessionSync } from "@/components/auth/session-sync";
import { OnboardingSession } from "./onboarding-session";
import styles from "./wedding.module.css";

export function WeddingShell({ children, user, weddingId, role }: {
  children: ReactNode; user: { id: string; name: string }; weddingId: string | null; role?: string;
}) {
  const content = (
    <div className={styles.shell}>
      <a href="#wedding-content" className={styles.skip}>Skip to content</a>
      <header className={styles.header}><div className={styles.headerInner}>
        <Link href="/" aria-label="Make My Marriage home"><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage" width={220} height={55} priority/></Link>
        <div className={styles.account}>
          {role && <div className={styles.identity}><span className={styles.userName} title={user.name}>{user.name}</span><span className={styles.role}>{role === "ADMIN" ? "Admin" : "Manager"}</span></div>}
          <LogoutButton className={styles.signOut}/>
        </div>
      </div></header>
      {children}
      <footer className={styles.footer}>© {new Date().getFullYear()} Make My Marriage. All rights reserved.</footer>
    </div>
  );
  return weddingId === null
    ? <OnboardingSession key={user.id} userId={user.id}>{content}</OnboardingSession>
    : <SessionSync userId={user.id} weddingId={weddingId}>{content}</SessionSync>;
}
