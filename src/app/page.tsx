import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { ServiceBenefits } from "@/components/site/ServiceBenefits";
import { FirebaseCategoryGrid, FirebaseProductGrid } from "@/components/firebase/StorefrontCatalog";
import { BrandsLineup } from "@/components/firebase/BrandsLineup";
import { TestimonialCarousel } from "@/components/site/TestimonialCarousel";

export default function Home() {
  const facets = { categories: [] as { id: string; name: string; slug: string; parentId: string | null }[], collections: [], sizes: [], colors: [] };
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSlideshow />

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
          <FirebaseProductGrid sort="featured" />
        </section>

        <section className="split-section section">
          <div>
            <p className="eyebrow">New arrivals</p>
            <h2>Fresh pieces, precise details.</h2>
          </div>
          <div className="product-list"><FirebaseProductGrid sort="newest" /></div>
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

        <FirebaseCategoryGrid />

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
          <FirebaseProductGrid sort="best-selling" />
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

        <BrandsLineup />
        <ServiceBenefits />
        <TestimonialCarousel />
      </main>
      <SiteFooter />
    </>
  );
}

