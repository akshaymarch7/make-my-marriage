import { AuthPage } from "@/components/auth/auth-page";
import { currentAccount } from "@/modules/auth/service";
import { redirect } from "next/navigation";
export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  const account = await currentAccount();
  if (account) redirect(account.wedding ? "/dashboard" : "/onboarding");
  return <AuthPage mode="login"/>;
}
