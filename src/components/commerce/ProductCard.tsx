"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { effectiveVariantPriceInCents, variantAvailableQuantity } from "@/lib/firebase-product-adapter";
import { useStoreSettings } from "@/hooks/use-store-settings";

type ProductCardProps = {
  product: {
    name: string;
    slug: string;
    shortDescription?: string | null;
    brand?: string | null;
    averageRating?: number | null;
    images: { url: string; altText: string }[];
    variants: { id: string; priceInCents: number; salePriceCents?: number | null; stockQuantity?: number; reservedStock?: number }[];
    category?: { name: string; slug: string } | null;
    collection?: { name: string; slug: string } | null;
  };
  recommendation?: boolean;
};

export function ProductCard({ product, recommendation = false }: ProductCardProps) {
  const { currency } = useStoreSettings();
  const variants = product.variants;
  const variant = variants.find((item) => variantAvailableQuantity({ stockQuantity: item.stockQuantity ?? 0, reservedStock: item.reservedStock ?? 0 }) > 0) ?? variants[0];
  const prices = variants.map((item) => effectiveVariantPriceInCents({ priceInCents: item.priceInCents, salePriceCents: item.salePriceCents ?? null })).filter(Number.isFinite);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : minPrice;
  const priceLabel = minPrice === maxPrice ? formatMoney(minPrice, currency) : `${formatMoney(minPrice, currency)} - ${formatMoney(maxPrice, currency)}`;
  const hasAvailableVariant = variants.some((item) => variantAvailableQuantity({ stockQuantity: item.stockQuantity ?? 0, reservedStock: item.reservedStock ?? 0 }) > 0);
  const available = Boolean(variant) && hasAvailableVariant;
  const image = product.images[0];
  const saleVariant = variants.find((item) => item.salePriceCents !== null && item.salePriceCents !== undefined && item.salePriceCents < item.priceInCents);
  const regularPrice = saleVariant ? formatMoney(saleVariant.priceInCents, currency) : null;
  const salePrice = saleVariant ? formatMoney(saleVariant.salePriceCents!, currency) : priceLabel;

  if (recommendation) {
    return <article className="product-card recommendation-card"><Link className="recommendation-card-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}><div className="recommendation-image-wrap">{saleVariant ? <span className="recommendation-sale-badge">Sale</span> : null}{image ? <img className="product-image" src={image.url} alt={image.altText} loading="lazy" decoding="async" /> : <div className="product-image product-image-empty" aria-hidden="true" />}</div><div className="recommendation-card-copy"><h3>{product.name}</h3><p className="recommendation-price">{regularPrice ? <del>{regularPrice}</del> : null}<strong>{salePrice}</strong></p></div></Link></article>;
  }

  return (
    <article className="product-card">
      <Link className="product-image-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        {saleVariant ? <span className="product-sale-badge">Sale</span> : null}
        {image ? (
          <img className="product-image" src={image.url} alt={image.altText} loading="lazy" decoding="async" />
        ) : (
          <div className="product-image product-image-empty" aria-hidden="true" />
        )}
      </Link>
      <div className="product-card-body">
        <div>
          <h3>
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          {product.shortDescription ? <p>{product.shortDescription}</p> : null}
        </div>
        <div className="product-card-actions">
          <span className="price">{saleVariant ? <><del>{regularPrice}</del><strong>{salePrice}</strong></> : priceLabel}</span>
          {variants.length > 1 ? (
            <Link className="button button-dark" href={`/products/${product.slug}`}>Options</Link>
          ) : (
            <AddToCartButton variantId={variant?.id ?? null} disabled={!available} label={available ? "Add" : "Sold out"} />
          )}
        </div>
      </div>
    </article>
  );
}
