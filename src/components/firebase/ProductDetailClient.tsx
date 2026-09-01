"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ProductPurchasePanel } from "@/components/commerce/ProductPurchasePanel";
import { useProduct, useProductRecommendations } from "@/hooks/use-products";
import { firebaseProductCard, productGalleryUrls, productPurchasables, type FirebaseProductVariant } from "@/lib/firebase-product-adapter";

export function ProductDetailClient({ slug }: { slug: string }) {
  const { product, loading } = useProduct(slug);
  const [selectedVariant, setSelectedVariant] = useState<FirebaseProductVariant | null>(null);

  const variants = useMemo(() => product ? productPurchasables(product) : [], [product]);
  const { products: recommendations, loading: recommendationsLoading } = useProductRecommendations(product);

  if (loading) return <main className="page-shell"><p>Loading product...</p></main>;
  if (!product) return <main className="page-shell"><section className="empty-state"><h2>Product unavailable</h2><p>This item may have been removed or is no longer published.</p></section></main>;

  const displayVariant = selectedVariant?.productId === product.id ? selectedVariant : variants.length === 1 ? variants[0] : null;
  const galleryUrls = productGalleryUrls(product, displayVariant);

  return <main className="page-shell"><section className="product-detail"><div className="product-gallery">{galleryUrls.length ? galleryUrls.map((url) => <img key={url} src={url} alt={product.title} />) : <div className="product-image-empty" />}</div><aside className="product-summary"><h1>{product.title}</h1><p className="delivery-note">Delivery within 1-3 business days</p><div className="product-service-row"><span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>Authenticity guaranteed</span><span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7zM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>Free delivery over R999</span><span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 1 4M20 4v7h-7" /></svg>7-day returns</span></div><ProductPurchasePanel key={product.id} variants={variants} onVariantChange={setSelectedVariant} /><div className="product-copy"><p>{product.shortDescription || product.description}</p></div></aside></section>{recommendationsLoading ? <section className="recommendations-section" aria-label="Loading recommendations"><h2>You may also like</h2><div className="recommendations-grid">{Array.from({ length: 4 }, (_, index) => <div className="recommendation-skeleton" key={index} />)}</div></section> : recommendations.length ? <section className="recommendations-section"><h2>You may also like</h2><div className="recommendations-grid">{recommendations.map((item) => <ProductCard key={item.id} product={firebaseProductCard(item)} recommendation />)}</div></section> : null}</main>;
}
