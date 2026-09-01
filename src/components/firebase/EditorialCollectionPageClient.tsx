"use client";

import { ProductCard } from "@/components/commerce/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { firebaseProductCard } from "@/lib/firebase-product-adapter";
import { defaultStoreSettings, subscribeStoreSettings } from "@/services/firebase-settings";
import { useEffect, useState } from "react";

export function EditorialCollectionPageClient({ id }: { id: string }) {
  const [settings, setSettings] = useState(defaultStoreSettings);
  const { products, loading } = useProducts();
  useEffect(() => subscribeStoreSettings(setSettings), []);
  const block = settings.editorialCollections.find((item) => item.id === id && item.enabled);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const visible = block?.productIds.flatMap((productId) => { const product = productsById.get(productId); return product ? [product] : []; }) ?? [];
  if (!block) return <main className="page-shell"><section className="empty-state"><h2>Collection unavailable.</h2><p>This editorial collection is no longer available.</p></section></main>;
  return <main className="page-shell"><section className="collection-hero"><p className="eyebrow gold">Curated collection</p><h1>{block.displayName}</h1></section><section className="collection-results"><p className="eyebrow">{loading ? "Loading…" : `${visible.length} pieces`}</p><div className="product-grid shop-grid">{visible.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />)}</div>{!loading && !visible.length ? <div className="empty-state"><h2>Nothing in this collection yet.</h2></div> : null}</section></main>;
}
