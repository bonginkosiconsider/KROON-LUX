"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultStoreSettings, subscribeStoreSettings } from "@/services/firebase-settings";

export function EditorialCollections() {
  const [settings, setSettings] = useState(defaultStoreSettings);
  useEffect(() => subscribeStoreSettings(setSettings), []);
  const blocks = settings.editorialCollections.filter((block) => block.enabled && block.imageUrl && block.displayName && block.productIds.length).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!blocks.length) return null;
  return <section aria-label="Editorial collections" className="editorial-collections section">{blocks.map((block) => <article className="editorial-collection" key={block.id}><Link aria-label={`Shop ${block.displayName}`} className="editorial-collection-image" href={`/editorial/${block.id}`}><img alt={block.altText || block.displayName} loading="lazy" src={block.imageUrl} /></Link><div className="editorial-collection-copy"><Link href={`/editorial/${block.id}`}><h2>{block.displayName}</h2></Link></div></article>)}</section>;
}
