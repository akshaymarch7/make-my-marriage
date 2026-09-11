import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { MembersPage } from "@/components/members/members-page";

export const metadata = { title: "Wedding members", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  if (account.membership.role !== "ADMIN") redirect("/dashboard");
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><MembersPage key={`${account.user.id}:${account.wedding.id}`} userId={account.user.id}/></WeddingShell>;
}
