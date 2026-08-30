import Link from "next/link";
import Image from "next/image";
import { HeaderActions } from "@/components/site/HeaderActions";
import kroonLuxeLogo from "../../../logo/backgrounderaser_1785409165.png";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/" aria-label="Kroon Luxe home">
        <Image alt="" priority sizes="(max-width: 720px) 120px, 180px" src={kroonLuxeLogo} />
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        <Link href="/shop">Shop</Link>
        <Link href="/shop?sort=newest">New arrivals</Link>
        <Link href="/shop?sort=best-selling">Best sellers</Link>
        <Link href="/#story">House</Link>
      </nav>
      <HeaderActions />
    </header>
  );
}

