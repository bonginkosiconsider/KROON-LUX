import { EditorialCollectionPageClient } from "@/components/firebase/EditorialCollectionPageClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default async function EditorialCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><SiteHeader /><EditorialCollectionPageClient id={id} /><SiteFooter /></>;
}
