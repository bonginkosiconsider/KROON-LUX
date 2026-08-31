"use client";

import { ProductCard } from "@/components/commerce/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useStoreTaxonomy } from "@/hooks/use-store-taxonomies";

const presetCollections: Record<string, { title: string; description: string }> = {
  "new-arrivals": { title: "New arrivals", description: "The latest pieces to join the Kroon Luxe collection." },
  accessories: { title: "Accessories", description: "Finishing pieces selected for everyday distinction." },
  sale: { title: "Sale", description: "Considered pieces, offered for a limited time." },
  "soccer-jerseys": { title: "Soccer jerseys", description: "Support your colours in standout style." },
};

function cardProduct(product: ReturnType<typeof useProducts>["products"][number]) {
  return { name: product.title, slug: product.slug, shortDescription: product.shortDescription || product.description, brand: product.brandName, images: product.imageUrls.map((url) => ({ url, altText: product.title })), category: { name: product.category, slug: product.category }, variants: [{ id: product.id, priceInCents: Math.round(product.price * 100), salePriceCents: product.salePrice ? Math.round(product.salePrice * 100) : undefined, stockQuantity: product.inventoryCount, reservedStock: 0 }] };
}

export function CollectionPageClient({ slug }: { slug: string }) {
  const { products, loading: productsLoading } = useProducts();
  const { item: brand, loading: brandsLoading } = useStoreTaxonomy("brands", slug);
  const { item: collection, loading: collectionsLoading } = useStoreTaxonomy("collections", slug);
  const preset = presetCollections[slug];
  const taxonomy = brand ?? collection;
  const title = taxonomy?.name ?? preset?.title ?? "Collection";
  const description = taxonomy?.description || preset?.description || "Browse the latest Kroon Luxe collection.";
  const normalized = slug.replace(/-/g, " ");
  const visible = products.filter((product) => {
    if (brand) return product.brandId === brand.id;
    if (collection) return product.collectionIds?.includes(collection.id);
    if (slug === "sale") return Boolean(product.salePrice && product.salePrice < product.price);
    if (slug === "new-arrivals") return [product.category, ...(product.categories ?? []), ...(product.tags ?? [])].some((value) => value.toLowerCase() === "new arrivals");
    return [product.category, ...(product.categories ?? []), ...(product.tags ?? [])].some((value) => value.toLowerCase() === normalized);
  });
  const loading = productsLoading || brandsLoading || collectionsLoading;
  return <main className="page-shell"><section className="collection-hero"><p className="eyebrow gold">{brand ? "Brand" : "Collection"}</p><h1>{title}</h1><p>{description}</p></section><section className="collection-results"><p className="eyebrow">{loading ? "Loading…" : `${visible.length} pieces`}</p><div className="product-grid shop-grid">{visible.map((product) => <ProductCard key={product.id} product={cardProduct(product)} />)}</div>{!loading && !visible.length ? <div className="empty-state"><h2>Nothing in this collection yet.</h2><p>Products assigned by the store team will appear here automatically.</p></div> : null}</section></main>;
}
