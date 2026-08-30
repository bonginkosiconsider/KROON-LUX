import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StorefrontCatalog } from "@/components/firebase/StorefrontCatalog";

export const metadata: Metadata = { title: "Shop", description: "Browse the Kroon Luxe collection." };

export default function ShopPage() {

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="shop-hero">
          <p className="eyebrow gold">Catalog</p>
          <h1>Shop the Kroon edit.</h1>
          <p>Search, filter, and sort the live catalog without loading the entire product database into the browser.</p>
        </section>

        <section className="shop-layout"><Suspense fallback={<p>Loading catalog…</p>}><StorefrontCatalog /></Suspense></section>
      </main>
      <SiteFooter />
    </>
  );
}

