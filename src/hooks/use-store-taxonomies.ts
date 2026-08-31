"use client";

import { useEffect, useState } from "react";
import type { StoreTaxonomy } from "@/lib/firebase-models";
import { subscribeTaxonomies, subscribeTaxonomyBySlug, type TaxonomyKind } from "@/services/firebase-taxonomies";

export function useStoreTaxonomies(kind: TaxonomyKind) {
  const [items, setItems] = useState<StoreTaxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeTaxonomies(kind, (next) => { setItems(next); setLoading(false); }), [kind]);
  return { items, loading };
}

export function useStoreTaxonomy(kind: TaxonomyKind, slug: string) {
  const [item, setItem] = useState<StoreTaxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeTaxonomyBySlug(kind, slug, (next) => { setItem(next); setLoading(false); }), [kind, slug]);
  return { item, loading };
}
