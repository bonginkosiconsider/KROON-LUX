"use client";

import { ProductPurchasePanel } from "@/components/commerce/ProductPurchasePanel";
import { useProduct } from "@/hooks/use-products";

export function ProductDetailClient({ slug }: { slug: string }) {
  const { product, loading } = useProduct(slug);
  if (loading) return <main className="page-shell"><p>Loading product…</p></main>;
  if (!product) return <main className="page-shell"><section className="empty-state"><h2>Product unavailable</h2><p>This item may have been removed or is no longer published.</p></section></main>;
  const variant = { id: product.id, name: product.title, sku: product.slug, priceInCents: Math.round(product.price * 100), salePriceCents: null, stockQuantity: product.inventoryCount, reservedStock: 0, size: null, color: null };
  return <main className="page-shell"><section className="product-detail"><div className="product-gallery">{product.imageUrls.length ? product.imageUrls.map((url) => <img key={url} src={url} alt={product.title} />) : <div className="product-image-empty" />}</div><aside className="product-summary"><p className="eyebrow gold">{product.category}</p><h1>{product.title}</h1><p className="lead">{product.description}</p><ProductPurchasePanel variants={[variant]} /><div className="product-copy"><p>{product.inventoryCount > 0 ? `${product.inventoryCount} available` : "Sold out"}</p></div></aside></section></main>;
}
