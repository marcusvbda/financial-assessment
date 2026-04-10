import { PublicCheckout } from '@/components/public-checkout';
import { getCurrentUser } from '@/lib/auth/server';

export default async function Home() {
  const user = await getCurrentUser();

  return <PublicCheckout user={user} />;
}
