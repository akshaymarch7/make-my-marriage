import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { currentAccount } from "@/modules/auth/service";
import { getTask, getTaskOptions } from "@/modules/tasks/service";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { TaskForm } from "@/components/tasks/task-form";
export const metadata = { title: "Edit task", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ taskId: string }> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (!account.wedding || !account.membership) redirect("/onboarding");
  const route = z.object({ taskId: objectIdSchema }).strict().safeParse(await params);
  if (!route.success) notFound();
  const task = await getTask(account.user.id, route.data.taskId).catch(error => { if (error instanceof AppError && error.status === 404) notFound(); throw error; });
  const choices = await getTaskOptions(account.user.id);
  return <WeddingShell editing user={account.user} weddingId={account.wedding.id} role={account.membership.role}><TaskForm key={task.id} task={task} choices={choices} timeZone={account.wedding.timeZone}/></WeddingShell>;
}
