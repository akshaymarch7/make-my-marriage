import { AuthPage } from "@/components/auth/auth-page";
import { currentAccount } from "@/modules/auth/service";
import { redirect } from "next/navigation";
export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  if (await currentAccount()) redirect("/welcome");
  return <AuthPage mode="login"/>;
}
