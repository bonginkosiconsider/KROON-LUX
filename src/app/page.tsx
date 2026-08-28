import { ProductCard } from "@/components/commerce/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCatalogFacets, listActiveProducts } from "@/server/catalog/products";

type Product = Awaited<ReturnType<typeof listActiveProducts>>["data"][number];

async function productSection(query: Parameters<typeof listActiveProducts>[0]) {
  try {
    return (await listActiveProducts(query)).data;
  } catch {
    return [] as Product[];
  }
}

export default async function Home() {
  const [featured, arrivals, bestSellers, facets] = await Promise.all([
    productSection({ limit: 3, sort: "featured" }),
    productSection({ limit: 3, sort: "newest" }),
    productSection({ limit: 3, sort: "best-selling" }),
    getCatalogFacets().catch(() => ({ categories: [], collections: [], sizes: [], colors: [] })),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow gold">The first edit / Johannesburg</p>
            <h1>Modern heirlooms for a lasting impression.</h1>
            <p className="hero-intro">
              Kroon Luxe is a premium commerce house built around considered pieces, refined materials, and a quiet black-and-gold point of view.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="/shop">
                Shop the edit
              </a>
              <a className="button button-ghost" href="#story">
                Our standard
              </a>
            </div>
          </div>
          <div className="hero-panel" aria-label="Kroon Luxe brand notes">
            <span>Limited seasonal drops</span>
            <span>Variation-aware inventory</span>
            <span>Secure checkout foundation</span>
          </div>
        </section>

        <section className="section" id="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Featured collection</p>
              <h2>Quietly distinct.</h2>
            </div>
            <a className="text-link" href="/shop">
              View all pieces
            </a>
          </div>
          <div className="product-grid">
            {featured.length > 0 ? (
              featured.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <p className="empty-catalog">The first edit is ready for products from the admin catalog.</p>
            )}
          </div>
        </section>

        <section className="split-section section">
          <div>
            <p className="eyebrow">New arrivals</p>
            <h2>Fresh pieces, precise details.</h2>
          </div>
          <div className="product-list">
            {arrivals.length > 0 ? (
              arrivals.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <p className="empty-catalog">New arrivals will appear as active products are published.</p>
            )}
          </div>
        </section>

        {facets.categories.length > 0 ? (
          <section className="section category-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Browse by category</p>
                <h2>The edit, your way.</h2>
              </div>
              <a className="text-link" href="/shop">Explore the catalogue</a>
            </div>
            <div className="category-grid">
              {facets.categories.filter((category) => !category.parentId).slice(0, 4).map((category, index) => (
                <a className={`category-card category-card-${index + 1}`} href={`/shop?category=${category.slug}`} key={category.id}>
                  <span>Explore</span><h3>{category.name}</h3><span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="dark-band section" id="story">
          <p className="eyebrow gold">The Kroon standard</p>
          <h2>Luxury is not loud. It is felt.</h2>
          <p>
            The platform is designed for real commerce: server-side authorization, normalized catalog data, variation-specific inventory, referral attribution, coupon controls, and auditable administration.
          </p>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Best sellers</p>
              <h2>Chosen often. Kept long.</h2>
            </div>
            <a className="text-link" href="/shop?sort=best-selling">
              Explore best sellers
            </a>
          </div>
          <div className="product-grid">
            {bestSellers.length > 0 ? (
              bestSellers.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <p className="empty-catalog">Best sellers are calculated from the live catalog and order data.</p>
            )}
          </div>
        </section>

        <section className="promo-band section">
          <div>
            <p className="eyebrow gold">Promoters</p>
            <h2>Private referrals, measured properly.</h2>
          </div>
          <p>
            Approved promoters receive unique links, click tracking, conversion attribution, and commission records that admins can approve and pay from the operations dashboard.
          </p>
          <a className="button button-light" href="/account">
            Apply from account
          </a>
        </section>

        <section className="newsletter section" id="newsletter">
          <div>
            <p className="eyebrow">Private access</p>
            <h2>Stay in the know.</h2>
          </div>
          <form>
            <label htmlFor="email">Your email address</label>
            <div className="email-row">
              <input id="email" type="email" placeholder="you@example.com" />
              <button type="submit">Join</button>
            </div>
            <p className="fine-print">By joining, you agree to receive considered correspondence from Kroon Luxe.</p>
          </form>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

