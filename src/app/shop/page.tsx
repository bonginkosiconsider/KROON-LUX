import type { Metadata } from "next";
import { StorefrontCatalog } from "@/components/firebase/StorefrontCatalog";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = { title: "Shop", description: "Browse the Kroon Luxe collection." };

export default function ShopPage() {
  return <><SiteHeader /><main className="page-shell"><section className="shop-hero"><p className="eyebrow gold">Catalog</p><h1>Shop the Kroon edit.</h1><p>Live availability and product details, directly from our collection.</p></section><StorefrontCatalog /></main><SiteFooter /></>;
}
