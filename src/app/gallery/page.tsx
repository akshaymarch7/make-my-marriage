import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { Gallery } from "@/components/gallery/gallery";
import { galleryEvents } from "@/modules/photos/service";
export const metadata = { title: "Wedding gallery", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount(); if (!account) redirect("/login"); if (!account.wedding || !account.membership) redirect("/onboarding");
  const events = await galleryEvents(account.user.id);
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role} editing><Gallery events={events.map(event => ({ id: event.id, name: event.name, archived: !!event.archivedAt }))}/></WeddingShell>;
}
