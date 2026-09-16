import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { getTaskOptions } from "@/modules/tasks/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { TaskForm } from "@/components/tasks/task-form";
export const metadata = { title: "Add a task", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const choices = await getTaskOptions(account.user.id);
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><TaskForm choices={choices} timeZone={account.wedding.timeZone}/></WeddingShell>;
}
