"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/firebase-models";
import { getProductRecommendations, subscribeProduct, subscribeProducts } from "@/services/firebase-products";

export function useProducts(publishedOnly = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => subscribeProducts(
    (next) => {
      setProducts(next);
      setError(null);
      setLoading(false);
    },
    publishedOnly,
    (nextError) => {
      setProducts([]);
      setError(nextError);
      setLoading(false);
    },
  ), [publishedOnly]);
  return { products, loading, error };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => subscribeProduct(
    slug,
    (next) => {
      setProduct(next);
      setError(null);
      setLoading(false);
    },
    (nextError) => {
      setProduct(null);
      setError(nextError);
      setLoading(false);
    },
  ), [slug]);
  return { product, loading, error };
}

export function useProductRecommendations(product: Product | null) {
  const [result, setResult] = useState<{ productId: string | null; products: Product[] }>({ productId: null, products: [] });

  useEffect(() => {
    let active = true;
    if (!product) return () => { active = false; };

    getProductRecommendations(product)
      .then((items) => { if (active) setResult({ productId: product.id, products: items }); })
      .catch(() => { if (active) setResult({ productId: product.id, products: [] }); });
    return () => { active = false; };
  }, [product]);

  return { products: result.productId === product?.id ? result.products : [], loading: product !== null && result.productId !== product.id };
}
