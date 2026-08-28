"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/firebase-models";
import { subscribeProduct, subscribeProducts } from "@/services/firebase-products";

export function useProducts(publishedOnly = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeProducts((next) => { setProducts(next); setLoading(false); }, publishedOnly), [publishedOnly]);
  return { products, loading };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => subscribeProduct(slug, (next) => { setProduct(next); setLoading(false); }), [slug]);
  return { product, loading };
}
