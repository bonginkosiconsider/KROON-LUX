import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ManagedPageView } from "@/components/site/ManagedPageView";
import { managedPageMetadata } from "@/server/content/pages";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; return managedPageMetadata("policies", slug); }
export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <><SiteHeader /><ManagedPageView section="policies" slug={slug} /><SiteFooter /></>; }
