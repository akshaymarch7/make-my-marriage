import { redirect } from "next/navigation";
import { currentAccount } from "@/modules/auth/service";
import { WeddingShell } from "@/components/wedding/wedding-shell";
import { OnboardingPage } from "@/components/wedding/onboarding-page";

export const metadata = { title: "Create your wedding", robots: { index: false, follow: false } };
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  if (account.wedding) redirect("/dashboard");
  return <WeddingShell user={account.user} weddingId={null}><OnboardingPage/></WeddingShell>;
}
