"use client";

import { useEffect, useState } from "react";
import { sanitizeRichText } from "@/lib/rich-text";
import type { ManagedPageSection, ManagedPage } from "@/lib/firebase-models";
import { subscribePublishedPage } from "@/services/firebase-pages";

function formatDate(page: ManagedPage) { const value = page.updatedAt ?? page.publishedAt ?? page.createdAt; return value ? value.toDate().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "Recently"; }
export function ManagedPageView({ section, slug }: { section: ManagedPageSection; slug: string }) {
  const [page, setPage] = useState<ManagedPage | null | undefined>(undefined);
  useEffect(() => subscribePublishedPage(section, slug, setPage), [section, slug]);
  useEffect(() => { if (!page) return; document.title = `${page.metaTitle || page.title} | KROON LUXE`; const description = page.metaDescription || `Read ${page.title} from Kroon Luxe.`; let meta = document.querySelector('meta[name="description"]'); if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); } meta.setAttribute("content", description); }, [page]);
  if (page === undefined) return <main className="managed-public-page"><p>Loading…</p></main>;
  if (!page) return <main className="managed-public-page"><h1>Page not found</h1><p>This page is unavailable or is not currently published.</p></main>;
  return <main className="managed-public-page"><header><h1>{page.title}</h1><p>Last updated: {formatDate(page)}</p></header><article dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.content) }} /></main>;
}
