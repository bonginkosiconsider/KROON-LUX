"use client";

import Link from "next/link";
import Image from "next/image";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { BrandsMenu } from "@/components/site/BrandsMenu";
import { HeaderActions } from "@/components/site/HeaderActions";
import kroonLuxeLogo from "../../../logo/backgrounderaser_1785409165.png";
import { useStoreSettings } from "@/hooks/use-store-settings";

export function SiteHeader() {
  const { storeName } = useStoreSettings();
  return (
    <div className="site-header-wrap">
      <AnnouncementBar />
      <header className="site-header">
        <Link className="site-logo" href="/" aria-label={`${storeName} home`}>
          <Image alt="" priority sizes="(max-width: 720px) 120px, 180px" src={kroonLuxeLogo} />
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/collections/new-arrivals">New arrivals</Link>
          <BrandsMenu />
          <Link href="/collections/accessories">Accessories</Link>
          <Link href="/collections/sale">Sale</Link>
          <Link href="/collections/soccer-jerseys">Soccer jerseys</Link>
        </nav>
        <HeaderActions />
      </header>
    </div>
  );
}

