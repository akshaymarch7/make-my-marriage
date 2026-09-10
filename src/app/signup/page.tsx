import { AuthPage } from "@/components/auth/auth-page";
import { currentAccount } from "@/modules/auth/service";
import { redirect } from "next/navigation";
export const metadata = { title: "Create an account" };
export default async function SignupPage() {
  if (await currentAccount()) redirect("/welcome");
  return <AuthPage mode="signup"/>;
}
