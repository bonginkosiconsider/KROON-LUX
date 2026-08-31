"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/commerce/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { firebaseProductCard } from "@/lib/firebase-product-adapter";
import type { Product } from "@/lib/firebase-models";

<<<<<<< HEAD
function productMatchesSearch(product: Product, value: string) {
  const term = value.trim().toLowerCase();
  if (!term) return true;

  return [
    product.title,
    product.category,
    product.sku,
    product.tags?.join(" "),
    ...(product.categories ?? []),
    ...(product.variations ?? []).flatMap((variation) => [variation.name, variation.sku, ...Object.values(variation.attributes ?? {})]),
  ].filter(Boolean).some((item) => String(item).toLowerCase().includes(term));
=======
function cardProduct(product: Product) {
  return { name: product.title, slug: product.slug, shortDescription: product.description, brand: product.brandName, images: product.imageUrls.map((url) => ({ url, altText: product.title })), category: { name: product.category, slug: product.category }, variants: [{ id: product.id, priceInCents: Math.round(product.price * 100), salePriceCents: product.salePrice ? Math.round(product.salePrice * 100) : undefined, stockQuantity: product.inventoryCount, reservedStock: 0 }] };
>>>>>>> 736422f (Build functional admin product manager)
}

type HomeCatalogSort = "featured" | "newest" | "best-selling";

export function FirebaseProductGrid({ sort }: { sort: HomeCatalogSort }) {
  const { products, loading } = useProducts();
  const visible = [...products]
    .sort((first, second) => sort === "newest" ? 0 : Number(second.featured) - Number(first.featured))
    .slice(0, 3);

  if (loading) return <div className="product-grid"><p className="empty-catalog">Loading the collection…</p></div>;
  return <div className="product-grid">{visible.length ? visible.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />) : <p className="empty-catalog">No published products yet.</p>}</div>;
}

export function FirebaseCategoryGrid() {
  const { products } = useProducts();
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 4);
  if (!categories.length) return null;
  return <section className="section category-section"><div className="section-heading"><div><p className="eyebrow">Browse by category</p><h2>The edit, your way.</h2></div><a className="text-link" href="/shop">Explore the catalogue</a></div><div className="category-grid">{categories.map((category, index) => <a className={`category-card category-card-${index + 1}`} href={`/shop?category=${encodeURIComponent(category)}`} key={category}><span>Explore</span><h3>{category}</h3><span aria-hidden="true">→</span></a>)}</div></section>;
}

export function StorefrontCatalog({ compact = false }: { compact?: boolean }) {
  const { products, loading } = useProducts();
  const params = useSearchParams();
  const [search, setSearch] = useState(() => params.get("search") ?? ""); const [category, setCategory] = useState(() => params.get("category") ?? "");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const filtered = products.filter((product) => productMatchesSearch(product, search) && (!category || product.category === category));
  const visible = compact ? filtered.filter((product) => product.featured).slice(0, 3) : filtered;
  if (compact) return <div className="product-grid">{loading ? <p className="empty-catalog">Loading the collection…</p> : visible.length ? visible.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />) : <p className="empty-catalog">The first edit is ready for products from the admin catalog.</p>}</div>;
  return <><div className="firebase-catalog-filters"><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="results-heading"><p className="eyebrow">{loading ? "Loading…" : `${filtered.length} pieces`}</p></div><div className="product-grid shop-grid">{filtered.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />)}{!loading && !filtered.length ? <p className="empty-catalog">No products match these filters yet.</p> : null}</div></>;
}
