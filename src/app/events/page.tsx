import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { listEvents } from "@/modules/events/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { EventList } from "@/components/events/event-list";
export const metadata = { title: "Wedding events", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const query = z.object({ includeArchived: z.enum(["true", "false"]).optional() }).strict().safeParse(await searchParams);
  if (!query.success) notFound();
  const events = await listEvents(account.user.id, query.data);
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><EventList events={events} timeZone={account.wedding.timeZone} includeArchived={query.data.includeArchived === "true"} userId={account.user.id} weddingId={account.wedding.id}/></WeddingShell>;
}
