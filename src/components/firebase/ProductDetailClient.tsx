"use client";

import { useMemo, useState } from "react";
import { ProductPurchasePanel } from "@/components/commerce/ProductPurchasePanel";
import { useProduct } from "@/hooks/use-products";
import { productGalleryUrls, productPurchasables, type FirebaseProductVariant } from "@/lib/firebase-product-adapter";

export function ProductDetailClient({ slug }: { slug: string }) {
  const { product, loading } = useProduct(slug);
  const [selectedVariant, setSelectedVariant] = useState<FirebaseProductVariant | null>(null);

  const variants = useMemo(() => product ? productPurchasables(product) : [], [product]);

  if (loading) return <main className="page-shell"><p>Loading product...</p></main>;
  if (!product) return <main className="page-shell"><section className="empty-state"><h2>Product unavailable</h2><p>This item may have been removed or is no longer published.</p></section></main>;

  const displayVariant = selectedVariant?.productId === product.id ? selectedVariant : variants.length === 1 ? variants[0] : null;
  const galleryUrls = productGalleryUrls(product, displayVariant);

  return <main className="page-shell"><section className="product-detail"><div className="product-gallery">{galleryUrls.length ? galleryUrls.map((url) => <img key={url} src={url} alt={product.title} />) : <div className="product-image-empty" />}</div><aside className="product-summary"><p className="eyebrow gold">{product.category}</p><h1>{product.title}</h1><p className="lead">{product.description}</p><ProductPurchasePanel key={product.id} variants={variants} onVariantChange={setSelectedVariant} /><div className="product-copy"><p>{product.shortDescription || product.description}</p></div></aside></section></main>;
}
