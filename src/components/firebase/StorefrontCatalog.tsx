"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { useProducts } from "@/hooks/use-products";
import type { Product } from "@/lib/firebase-models";

function cardProduct(product: Product) {
  return { name: product.title, slug: product.slug, shortDescription: product.description, images: product.imageUrls.map((url) => ({ url, altText: product.title })), category: { name: product.category, slug: product.category }, variants: [{ id: product.id, priceInCents: Math.round(product.price * 100), stockQuantity: product.inventoryCount, reservedStock: 0 }] };
}

export function StorefrontCatalog({ compact = false }: { compact?: boolean }) {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const filtered = products.filter((product) => product.title.toLowerCase().includes(search.toLowerCase()) && (!category || product.category === category));
  const visible = compact ? filtered.filter((product) => product.featured).slice(0, 3) : filtered;
  if (compact) return <div className="product-grid">{loading ? <p className="empty-catalog">Loading the collection…</p> : visible.length ? visible.map((product) => <ProductCard key={product.id} product={cardProduct(product)} />) : <p className="empty-catalog">The first edit is ready for products from the admin catalog.</p>}</div>;
  return <><div className="firebase-catalog-filters"><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="results-heading"><p className="eyebrow">{loading ? "Loading…" : `${filtered.length} pieces`}</p></div><div className="product-grid shop-grid">{filtered.map((product) => <ProductCard key={product.id} product={cardProduct(product)} />)}{!loading && !filtered.length ? <p className="empty-catalog">No products match these filters yet.</p> : null}</div></>;
}
