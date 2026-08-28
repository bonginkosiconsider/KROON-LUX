import type { Metadata } from "next";
import { ProductDetailClient } from "@/components/firebase/ProductDetailClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

type ProductPageProps = { params: Promise<{ slug: string }> };
export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return <><SiteHeader /><ProductDetailClient slug={slug} /><SiteFooter /></>;
}
