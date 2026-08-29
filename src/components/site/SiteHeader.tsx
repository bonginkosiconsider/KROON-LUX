import Link from "next/link";
import { HeaderActions } from "@/components/site/HeaderActions";
import { getCurrentUser } from "@/server/auth/session";
import { readCart } from "@/server/cart/service";

export async function SiteHeader() {
  const [user, cart] = await Promise.all([
    getCurrentUser().catch(() => null),
    readCart().catch(() => null),
  ]);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Kroon Luxe home">
        <span>K</span>ROON LUXE
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        <Link href="/shop">Shop</Link>
        <Link href="/shop?sort=newest">New arrivals</Link>
        <Link href="/shop?sort=best-selling">Best sellers</Link>
        <Link href="/#story">House</Link>
      </nav>
      <HeaderActions isSignedIn={Boolean(user)} itemCount={cart?.itemCount ?? 0} />
    </header>
  );
}

