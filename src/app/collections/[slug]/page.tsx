import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CollectionPageClient } from "@/components/firebase/CollectionPageClient";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <><SiteHeader /><CollectionPageClient slug={slug} /><SiteFooter /></>;
}
