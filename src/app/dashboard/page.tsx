import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { OverviewPage } from "@/components/wedding/overview-page";

export const metadata = { title: "Your wedding", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><OverviewPage wedding={account.wedding}/></WeddingShell>;
}
