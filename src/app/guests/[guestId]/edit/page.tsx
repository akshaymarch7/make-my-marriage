import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getGuest, getGuestEvents } from "@/modules/guests/service";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { GuestForm } from "@/components/guests/guest-form";
export const metadata = { title: "Edit guest", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ guestId: string }> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const route = z.object({ guestId: objectIdSchema }).strict().safeParse(await params);
  if (!route.success) notFound();
  const guest = await getGuest(account.user.id, route.data.guestId).catch(error => { if (error instanceof AppError && error.status === 404) notFound(); throw error; });
  const events = await getGuestEvents(account.user.id);
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><GuestForm key={guest.id} guest={guest} events={events} timeZone={account.wedding.timeZone}/></WeddingShell>;
}
