import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatMoney } from "@/lib/format";
import { getActiveProductBySlug } from "@/server/catalog/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: product.images[0]?.url ? [{ url: product.images[0].url, alt: product.images[0].altText }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const firstAvailable = product.variants.find((variant) => variant.stockQuantity - variant.reservedStock > 0) ?? product.variants[0];
  const price = firstAvailable?.salePriceCents ?? firstAvailable?.priceInCents ?? product.startingPriceCents ?? 0;
  const averageRating =
    product.reviews.length === 0 ? null : product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description,
    image: product.images.map((image) => image.url),
    brand: { "@type": "Brand", name: product.brand ?? "Kroon Luxe" },
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: (price / 100).toFixed(2),
      availability: firstAvailable && firstAvailable.stockQuantity - firstAvailable.reservedStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <section className="product-detail">
          <div className="product-gallery">
            {product.images.length > 0 ? (
              product.images.map((image) => <img key={image.url} src={image.url} alt={image.altText} loading="lazy" decoding="async" />)
            ) : (
              <div className="product-image-empty" aria-hidden="true" />
            )}
          </div>
          <aside className="product-summary">
            <p className="eyebrow gold">{product.category?.name ?? product.collection?.name ?? product.brand ?? "Kroon Luxe"}</p>
            <h1>{product.name}</h1>
            <p className="product-price">{formatMoney(price)}</p>
            {product.shortDescription ? <p className="lead">{product.shortDescription}</p> : null}
            <AddToCartButton
              variantId={firstAvailable?.id ?? null}
              disabled={!firstAvailable || firstAvailable.stockQuantity - firstAvailable.reservedStock <= 0}
            />
            <div className="variant-list" aria-label="Available variations">
              {product.variants.map((variant) => {
                const available = variant.stockQuantity - variant.reservedStock;
                return (
                  <div key={variant.id} className="variant-row">
                    <div>
                      <strong>{variant.name}</strong>
                      <span>{[variant.color, variant.size].filter(Boolean).join(" / ") || variant.sku}</span>
                    </div>
                    <span>{available > 0 ? `${available} available` : "Sold out"}</span>
                  </div>
                );
              })}
            </div>
            <div className="product-copy">
              {product.description ? <p>{product.description}</p> : null}
              <p>{product.shippingInfo ?? "Shipping methods, thresholds, and tracking are managed through the commerce backend."}</p>
              {averageRating ? <p>Average rating: {averageRating.toFixed(1)} / 5</p> : null}
            </div>
          </aside>
        </section>

        <section className="section product-reviews">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reviews</p>
              <h2>Verified purchase feedback.</h2>
            </div>
          </div>
          {product.reviews.length > 0 ? (
            <div className="review-grid">
              {product.reviews.map((review) => (
                <article key={review.id}>
                  <span>{review.rating} / 5</span>
                  <h3>{review.title ?? "Kroon client"}</h3>
                  <p>{review.body}</p>
                  <small>{review.verified ? "Verified purchase" : "Customer review"}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-catalog">Reviews from verified orders will appear here after admin approval.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

