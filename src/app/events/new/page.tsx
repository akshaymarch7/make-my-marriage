import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { EventForm } from "@/components/events/event-form";
export const metadata = { title: "Add an event", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><EventForm timeZone={account.wedding.timeZone}/></WeddingShell>;
}
