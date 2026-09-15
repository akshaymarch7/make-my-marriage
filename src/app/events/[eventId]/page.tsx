import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getEvent } from "@/modules/events/service";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { EventDetails } from "@/components/events/event-details";
export const metadata = { title: "Event details", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const route = z.object({ eventId: objectIdSchema }).strict().safeParse(await params);
  const query = z.object({ saved: z.enum(["created", "updated"]).optional() }).strict().safeParse(await searchParams);
  if (!route.success || !query.success) notFound();
  const event = await getEvent(account.user.id, route.data.eventId).catch(error => { if (error instanceof AppError && error.status === 404) notFound(); throw error; });
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><EventDetails event={event} saved={query.data.saved} timeZone={account.wedding.timeZone} userId={account.user.id} weddingId={account.wedding.id}/></WeddingShell>;
}
