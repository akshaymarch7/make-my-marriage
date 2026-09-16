import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getGuest } from "@/modules/guests/service";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { GuestDetails } from "@/components/guests/guest-details";
export const metadata = { title: "Guest details", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ guestId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const route = z.object({ guestId: objectIdSchema }).strict().safeParse(await params);
  const query = z.object({ saved: z.enum(["created", "updated"]).optional() }).strict().safeParse(await searchParams);
  if (!route.success || !query.success) notFound();
  const guest = await getGuest(account.user.id, route.data.guestId).catch(error => { if (error instanceof AppError && error.status === 404) notFound(); throw error; });
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><GuestDetails guest={guest} saved={query.data.saved} timeZone={account.wedding.timeZone} userId={account.user.id} weddingId={account.wedding.id}/></WeddingShell>;
}
