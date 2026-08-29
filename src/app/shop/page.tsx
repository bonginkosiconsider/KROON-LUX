import type { Metadata } from "next";
import { ProductCard } from "@/components/commerce/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCatalogFacets, listActiveProducts, ProductListQuery } from "@/server/catalog/products";

export const metadata: Metadata = { title: "Shop", description: "Browse the Kroon Luxe collection." };

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function moneyParam(value: string | string[] | undefined) {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function listQuery(params: Record<string, string | string[] | undefined>): ProductListQuery {
  return {
    search: first(params.search),
    category: first(params.category),
    collection: first(params.collection),
    size: first(params.size),
    color: first(params.color),
    availability: first(params.availability) as ProductListQuery["availability"],
    sort: (first(params.sort) as ProductListQuery["sort"]) || "featured",
    minPrice: moneyParam(params.minPrice),
    maxPrice: moneyParam(params.maxPrice),
    limit: 24,
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const query = listQuery(params);
  const [productsResult, facetsResult] = await Promise.allSettled([listActiveProducts(query), getCatalogFacets()]);
  const products = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const facets = facetsResult.status === "fulfilled" ? facetsResult.value : { categories: [], collections: [], sizes: [], colors: [] };

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="shop-hero">
          <p className="eyebrow gold">Catalog</p>
          <h1>Shop the Kroon edit.</h1>
          <p>Search, filter, and sort the live catalog without loading the entire product database into the browser.</p>
        </section>

        <section className="shop-layout">
          <form className="filter-panel">
            <label>
              Search
              <input name="search" defaultValue={query.search ?? ""} placeholder="Name, SKU, category" />
            </label>
            <label>
              Category
              <select name="category" defaultValue={query.category ?? ""}>
                <option value="">All categories</option>
                {facets.categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Collection
              <select name="collection" defaultValue={query.collection ?? ""}>
                <option value="">All collections</option>
                {facets.collections.map((collection) => (
                  <option key={collection.id} value={collection.slug}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Min price
                <input name="minPrice" type="number" min="0" defaultValue={query.minPrice ?? ""} />
              </label>
              <label>
                Max price
                <input name="maxPrice" type="number" min="0" defaultValue={query.maxPrice ?? ""} />
              </label>
            </div>
            <label>
              Size
              <select name="size" defaultValue={query.size ?? ""}>
                <option value="">Any size</option>
                {facets.sizes.map((size) => (
                  <option key={size ?? "unknown-size"} value={size ?? ""}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Color
              <select name="color" defaultValue={query.color ?? ""}>
                <option value="">Any color</option>
                {facets.colors.map((color) => (
                  <option key={color ?? "unknown-color"} value={color ?? ""}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Availability
              <select name="availability" defaultValue={query.availability ?? ""}>
                <option value="">Any availability</option>
                <option value="in-stock">In stock</option>
                <option value="low-stock">Low stock</option>
                <option value="out-of-stock">Out of stock</option>
              </select>
            </label>
            <label>
              Sort
              <select name="sort" defaultValue={query.sort ?? "featured"}>
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
                <option value="best-selling">Best selling</option>
                <option value="highest-rated">Highest rated</option>
              </select>
            </label>
            <button className="button button-dark" type="submit">
              Apply filters
            </button>
          </form>

          <div>
            <div className="results-heading">
              <p className="eyebrow">{products.length} pieces</p>
              <a className="text-link" href="/shop">
                Reset filters
              </a>
            </div>
            <div className="product-grid shop-grid">
              {products.length > 0 ? (
                products.map((product) => <ProductCard key={product.id} product={product} />)
              ) : (
                <p className="empty-catalog">No products match these filters yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

