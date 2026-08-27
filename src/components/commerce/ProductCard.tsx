import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";

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
};

export function ProductCard({ product }: ProductCardProps) {
  const variant = product.variants[0];
  const price = variant?.salePriceCents ?? variant?.priceInCents ?? 0;
  const available = variant ? (variant.stockQuantity ?? 0) - (variant.reservedStock ?? 0) > 0 : false;
  const image = product.images[0];

  return (
    <article className="product-card">
      <Link className="product-image-link" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        {image ? (
          <img className="product-image" src={image.url} alt={image.altText} loading="lazy" decoding="async" />
        ) : (
          <div className="product-image product-image-empty" aria-hidden="true" />
        )}
      </Link>
      <div className="product-card-body">
        <div>
          <p className="eyebrow">{product.category?.name ?? product.collection?.name ?? product.brand ?? "Kroon Luxe"}</p>
          <h3>
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          {product.shortDescription ? <p>{product.shortDescription}</p> : null}
        </div>
        <div className="product-card-actions">
          <span className="price">{formatMoney(price)}</span>
          <AddToCartButton variantId={variant?.id ?? null} disabled={!available} label={available ? "Add" : "Sold out"} />
        </div>
      </div>
    </article>
  );
}

