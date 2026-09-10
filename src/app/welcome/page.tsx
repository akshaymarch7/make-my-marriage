import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";

// Keep previously bookmarked account links working after onboarding launches.
export default async function WelcomePage() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  redirect(account.wedding ? "/dashboard" : "/onboarding");
}
