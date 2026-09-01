import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ManagedPageView } from "@/components/site/ManagedPageView";
import { managedPageMetadata } from "@/server/content/pages";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; return managedPageMetadata("pages", slug); }
export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <><SiteHeader /><ManagedPageView section="pages" slug={slug} /><SiteFooter /></>; }
