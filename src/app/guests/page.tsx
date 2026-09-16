import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getGuestEvents, listGuests } from "@/modules/guests/service";
import { guestQuerySchema } from "@/modules/guests/schemas";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { GuestList } from "@/components/guests/guest-list";
export const metadata = { title: "Wedding guests", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const { deleted, ...raw } = await searchParams;
  if (!z.literal("1").optional().safeParse(deleted).success) notFound();
  // Native GET filters submit empty options; only recognised empty filters are omitted.
  const filters = Object.fromEntries(Object.entries(raw).filter(([key, value]) => !(key in guestQuerySchema.shape && value === "")));
  const query = guestQuerySchema.safeParse(filters); if (!query.success) notFound();
  const [result, events] = await Promise.all([listGuests(account.user.id, filters), getGuestEvents(account.user.id)]);
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><GuestList result={result} events={events} query={query.data} userId={account.user.id} weddingId={account.wedding.id} deleted={deleted === "1"}/></WeddingShell>;
}
