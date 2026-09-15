import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getEvent } from "@/modules/events/service";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { EventForm } from "@/components/events/event-form";
export const metadata = { title: "Edit event", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const route = z.object({ eventId: objectIdSchema }).strict().safeParse(await params);
  if (!route.success) notFound();
  const event = await getEvent(account.user.id, route.data.eventId).catch(error => { if (error instanceof AppError && error.status === 404) notFound(); throw error; });
  if (event.archivedAt) redirect(`/events/${event.id}`);
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><EventForm key={event.id} event={event} timeZone={account.wedding.timeZone}/></WeddingShell>;
}
