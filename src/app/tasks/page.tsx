import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getTaskOptions, listTasks } from "@/modules/tasks/service";
import { taskQuerySchema } from "@/modules/tasks/schemas";
import { eventDateParts } from "@/modules/events/dates";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { TaskList } from "@/components/tasks/task-list";
export const metadata = { title: "Wedding tasks", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const { deleted, ...raw } = await searchParams;
  if (!z.literal("1").optional().safeParse(deleted).success) notFound();
  // Native GET filters submit empty options; only recognised empty filters are omitted.
  const filters = Object.fromEntries(Object.entries(raw).filter(([key, value]) => !(key in taskQuerySchema.shape && value === "")));
  const query = taskQuerySchema.safeParse(filters); if (!query.success) notFound();
  const [result, choices] = await Promise.all([listTasks(account.user.id, filters), getTaskOptions(account.user.id)]);
  return <WeddingShell user={account.user} weddingId={account.wedding.id} role={account.membership.role}><TaskList result={result} choices={choices} query={query.data} timeZone={account.wedding.timeZone} today={eventDateParts(new Date().toISOString(), account.wedding.timeZone).date} userId={account.user.id} weddingId={account.wedding.id} deleted={deleted === "1"}/></WeddingShell>;
}
