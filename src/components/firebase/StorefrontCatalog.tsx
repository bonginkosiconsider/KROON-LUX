"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ReferralCapture } from "@/components/firebase/ReferralCapture";
import { useProducts } from "@/hooks/use-products";
import { firebaseProductCard } from "@/lib/firebase-product-adapter";
import { slugify, type Product } from "@/lib/firebase-models";
import { formatMoney } from "@/lib/format";
import { defaultStoreSettings, subscribeStoreSettings } from "@/services/firebase-settings";

function productMatchesSearch(product: Product, value: string) {
  const term = value.trim().toLowerCase();
  if (!term) return true;

  return [
    product.title,
    product.category,
    product.sku,
    product.tags?.join(" "),
    ...(product.categories ?? []),
    ...(product.variations ?? []).flatMap((variation) => [
      variation.name,
      variation.sku,
      ...Object.values(variation.attributes ?? {}),
    ]),
  ]
    .filter(Boolean)
    .some((item) => String(item).toLowerCase().includes(term));
}

type HomeCatalogSort = "featured" | "newest" | "best-selling";

export function FirebaseProductGrid({ sort }: { sort: HomeCatalogSort }) {
  const { products, loading } = useProducts();
  const visible = [...products]
    .sort((first, second) => (sort === "newest" ? 0 : Number(second.featured) - Number(first.featured)))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="product-grid">
        <p className="empty-catalog">Loading the collection...</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {visible.length ? (
        visible.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />)
      ) : (
        <p className="empty-catalog">No published products yet.</p>
      )}
    </div>
  );
}

export function FirebaseHomePicks() {
  const { products, loading } = useProducts();
  const [settings, setSettings] = useState(defaultStoreSettings);
  useEffect(() => subscribeStoreSettings(setSettings), []);
  const picks = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));
    return settings.featuredProductIds.flatMap((id) => {
      const product = productsById.get(id);
      return product ? [product] : [];
    });
  }, [products, settings.featuredProductIds]);

  if (loading) return <div className="home-picks-grid"><p className="empty-catalog">Loading Kroon Luxe Picks...</p></div>;
  return <div className="home-picks-grid">{picks.length ? picks.map((product) => <HomePickCard key={product.id} product={product} />) : <p className="empty-catalog">Kroon Luxe Picks are being curated.</p>}</div>;
}

function HomePickCard({ product }: { product: Product }) {
  const onSale = product.salePrice !== undefined && product.salePrice < product.price;
  return <article className="home-pick-card"><Link aria-label={`View ${product.title}`} className="home-pick-image" href={`/products/${product.slug}`}>{onSale ? <span>Sale</span> : null}{product.imageUrls[0] ? <img alt={product.title} src={product.imageUrls[0]} /> : <div aria-hidden="true" />}</Link><div className="home-pick-copy"><h3><Link href={`/products/${product.slug}`}>{product.title}</Link></h3><p>{onSale ? <><del>{formatMoney(product.price * 100)}</del><strong>{formatMoney(product.salePrice! * 100)}</strong></> : <strong>{formatMoney(product.price * 100)}</strong>}</p></div></article>;
}

export function FirebaseCategoryGrid() {
  const { products } = useProducts();
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 4);
  if (!categories.length) return null;

  return (
    <section className="section category-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Browse by category</p>
          <h2>The edit, your way.</h2>
        </div>
        <a className="text-link" href="/shop">
          Explore the catalogue
        </a>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => (
          <a className={`category-card category-card-${index + 1}`} href={`/shop?category=${encodeURIComponent(slugify(category))}`} key={category}>
            <span>Explore</span>
            <h3>{category}</h3>
            <span aria-hidden="true">-&gt;</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function StorefrontCatalog({ compact = false }: { compact?: boolean }) {
  const { products, loading } = useProducts();
  const params = useSearchParams();
  const [search, setSearch] = useState(() => params.get("search") ?? "");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const filtered = products.filter((product) => productMatchesSearch(product, search) && (!category || slugify(product.category) === category));
  const visible = compact ? filtered.filter((product) => product.featured).slice(0, 3) : filtered;

  if (compact) {
    return (
      <div className="product-grid">
        {loading ? (
          <p className="empty-catalog">Loading the collection...</p>
        ) : visible.length ? (
          visible.map((product) => <ProductCard key={product.id} product={firebaseProductCard(product)} />)
        ) : (
          <p className="empty-catalog">The first edit is ready for products from the admin catalog.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <ReferralCapture />
      <div className="firebase-catalog-filters">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={slugify(item)}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="results-heading">
        <p className="eyebrow">{loading ? "Loading..." : `${filtered.length} pieces`}</p>
      </div>
      <div className="product-grid shop-grid">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={firebaseProductCard(product)} />
        ))}
        {!loading && !filtered.length ? <p className="empty-catalog">No products match these filters yet.</p> : null}
      </div>
    </>
  );
}
