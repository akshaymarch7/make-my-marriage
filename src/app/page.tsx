import { HomePage } from '@/components/home/home-page';
import { HomeSession } from '@/components/home/home-session';
import { currentAccount } from '@/modules/auth/service';

export default async function Home() {
  const account = await currentAccount();
  const initialState = !account ? 'signed-out' : account.wedding ? 'wedding' : 'onboarding';
  return <HomeSession initialState={initialState}><HomePage /></HomeSession>;
}
