import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { getGuestEvents } from "@/modules/guests/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { GuestForm } from "@/components/guests/guest-form";
export const metadata = { title: "Add a guest", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const events = await getGuestEvents(account.user.id);
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><GuestForm events={events} timeZone={account.wedding.timeZone}/></WeddingShell>;
}
