import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { EditWeddingPage } from "@/components/wedding/edit-page";

export const metadata = { title: "Edit your wedding", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  if (!["ADMIN", "MANAGER"].includes(account.membership.role)) redirect("/dashboard");
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><EditWeddingPage wedding={account.wedding}/></WeddingShell>;
}
