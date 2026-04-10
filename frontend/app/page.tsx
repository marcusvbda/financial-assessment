import { PublicCheckout } from '@/components/public-checkout';
import { getCurrentUser } from '@/lib/auth/server';

function getRandomProductPrice() {
  return Math.floor(Math.random() * 151) + 50;
}

export default async function Home() {
  const user = await getCurrentUser();

  // to emulate different prices
  const productPrice = getRandomProductPrice();

  return <PublicCheckout productPrice={productPrice} user={user} />;
}
