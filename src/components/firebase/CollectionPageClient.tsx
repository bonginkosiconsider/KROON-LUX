"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useStoreTaxonomy } from "@/hooks/use-store-taxonomies";

const presetCollections: Record<string, { title: string }> = {
  "new-arrivals": { title: "New arrivals" },
  accessories: { title: "Accessories" },
  sale: { title: "Sale" },
  "soccer-jerseys": { title: "Soccer jerseys" },
};

function cardProduct(product: ReturnType<typeof useProducts>["products"][number]) {
  return { name: product.title, slug: product.slug, shortDescription: product.shortDescription || product.description, brand: product.brandName, images: product.imageUrls.map((url) => ({ url, altText: product.title })), category: { name: product.category, slug: product.category }, variants: [{ id: product.id, priceInCents: Math.round(product.price * 100), salePriceCents: product.salePrice ? Math.round(product.salePrice * 100) : undefined, stockQuantity: product.inventoryCount, reservedStock: 0 }] };
}

export function CollectionPageClient({ slug }: { slug: string }) {
  const [sort, setSort] = useState("featured");
  const { products, loading: productsLoading } = useProducts();
  const { item: brand, loading: brandsLoading } = useStoreTaxonomy("brands", slug);
  const { item: collection, loading: collectionsLoading } = useStoreTaxonomy("collections", slug);
  const preset = presetCollections[slug];
  const taxonomy = brand ?? collection;
  const title = taxonomy?.name ?? preset?.title ?? "Collection";
  const normalized = slug.replace(/-/g, " ");
  const visible = products.filter((product) => {
    if (brand) return product.brandId === brand.id;
    if (collection) return product.collectionIds?.includes(collection.id);
    if (slug === "sale") return Boolean(product.salePrice && product.salePrice < product.price);
    if (slug === "new-arrivals") return [product.category, ...(product.categories ?? []), ...(product.tags ?? [])].some((value) => value.toLowerCase() === "new arrivals");
    return [product.category, ...(product.categories ?? []), ...(product.tags ?? [])].some((value) => value.toLowerCase() === normalized);
  });
  const loading = productsLoading || brandsLoading || collectionsLoading;
  const displayed = useMemo(() => [...visible].sort((a, b) => sort === "price-asc" ? (a.salePrice ?? a.price) - (b.salePrice ?? b.price) : sort === "price-desc" ? (b.salePrice ?? b.price) - (a.salePrice ?? a.price) : 0), [sort, visible]);

  return <main className="page-shell"><section className="collection-hero"><h1>{title}</h1></section><section className="collection-results"><div className="collection-toolbar"><label className="collection-sort">Sort by:<select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label><span className="collection-count">{loading ? "Loading…" : `${displayed.length} products`}</span></div><div className="product-grid shop-grid">{displayed.map((product) => <ProductCard key={product.id} product={cardProduct(product)} />)}</div>{!loading && !displayed.length ? <div className="empty-state"><h2>Nothing in this collection yet.</h2><p>Products assigned by the store team will appear here automatically.</p></div> : null}</section></main>;
}
