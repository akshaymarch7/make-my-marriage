import { AuthPage } from "@/components/auth/auth-page";
import { currentAccount } from "@/modules/auth/service";
import { redirect } from "next/navigation";
import { invitationReturnTo } from "@/modules/auth/return-to";
import { invitedEmailForAuth } from "@/server/auth/invitation-context";
export const metadata = { title: "Create an account" };
export default async function SignupPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const returnTo = invitationReturnTo(await searchParams ?? {});
  const account = await currentAccount();
  if (account) redirect(returnTo ?? (account.wedding ? "/dashboard" : "/onboarding"));
  return <AuthPage mode="signup" returnTo={returnTo} invitedEmail={await invitedEmailForAuth(returnTo)}/>;
}
