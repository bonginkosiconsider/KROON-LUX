import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { ServiceBenefits } from "@/components/site/ServiceBenefits";
import { TestimonialCarousel } from "@/components/site/TestimonialCarousel";
import { FirebaseCategoryGrid, FirebaseProductGrid } from "@/components/firebase/StorefrontCatalog";
import { BrandsLineup } from "@/components/firebase/BrandsLineup";

export default function Home() {
  const facets = { categories: [] as { id: string; name: string; slug: string; parentId: string | null }[] };
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

        <BrandsLineup />
        <ServiceBenefits />
        <TestimonialCarousel />
      </main>
      <SiteFooter />
    </>
  );
}

