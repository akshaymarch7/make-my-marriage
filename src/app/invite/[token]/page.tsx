import { connection } from "next/server";
import { z } from "zod";
import { getPublicGuestInvitation } from "@/modules/guests/invitation-service";
import { AppError } from "@/server/http/app-error";
import { InvitationUnavailable, PublicInvitationPage } from "@/components/invitations/public-invitation";
export const metadata = { title: "Your personal invitation", description: "A private invitation to celebrate together.", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" as const };
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const route = z.object({ token: z.string() }).strict().parse(await params);
  if (!z.object({}).strict().safeParse(await searchParams).success) return <InvitationUnavailable/>;
  const invitation = await getPublicGuestInvitation(route.token).catch(error => { if (error instanceof AppError && error.status === 404) return null; throw error; });
  return invitation ? <PublicInvitationPage key={route.token} initial={invitation} token={route.token}/> : <InvitationUnavailable/>;
}
