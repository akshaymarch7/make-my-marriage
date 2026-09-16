import { getRsvpSummary } from "@/modules/guests/invitation-service";
import { getGuestSummary } from "@/modules/guests/service";
import { getTaskSummary } from "@/modules/tasks/service";
import { listEvents } from "@/modules/events/service";
import { listMembers } from "@/modules/memberships/service";
import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { OverviewPage } from "@/components/wedding/overview-page";
import { z } from "zod";

export const metadata = { title: "Your wedding", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = z.object({ updated: z.literal("1").optional() }).strict().safeParse(await searchParams);
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const members = (await listMembers(account.user.id)).map(member => ({ id: member.user.id, name: member.user.name, role: member.role }));
  const [events, tasks, guests, rsvp] = await Promise.all([listEvents(account.user.id), getTaskSummary(account.user.id), getGuestSummary(account.user.id), getRsvpSummary(account.user.id)]);
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><OverviewPage rsvp={rsvp} guests={guests} tasks={tasks} events={events} members={members} role={account.membership.role} wedding={account.wedding} updated={query.success && query.data.updated === "1"}/></WeddingShell>;
}
