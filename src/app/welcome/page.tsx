import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentAccount } from "@/modules/auth/service";
import { SessionSync } from "@/components/auth/session-sync";
import { LogoutButton } from "@/components/auth/auth-form";
import styles from "@/components/auth/auth.module.css";
export const metadata = { title: "Welcome", robots: { index: false, follow: false } };
export default async function WelcomePage() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return <SessionSync userId={account.user.id}><main className={styles.welcome}><Link href="/"><Image src="/images/make-my-marriage-logo.svg" width={240} height={60} alt="Make My Marriage"/></Link><section className={styles.welcomeCard}><span className={styles.eyebrow}>Your account is ready</span><h1>Welcome, {account.user.name}.</h1><p>You’re signed in as <strong>{account.user.email}</strong>.</p><div className={styles.notice}><h2>Your wedding journey starts here.</h2><p>Wedding setup is coming next. Soon, you’ll be able to create your wedding workspace and start bringing your celebration together.</p></div><LogoutButton/></section></main></SessionSync>;
}
