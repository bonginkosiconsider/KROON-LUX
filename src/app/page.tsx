import { Suspense } from "react";
import { BrandsLineup } from "@/components/firebase/BrandsLineup";
import { EditorialCollections } from "@/components/firebase/EditorialCollections";
import { FirebaseHomePicks } from "@/components/firebase/StorefrontCatalog";
import { ReferralCapture } from "@/components/firebase/ReferralCapture";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { ServiceBenefits } from "@/components/site/ServiceBenefits";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TestimonialCarousel } from "@/components/site/TestimonialCarousel";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={null}><ReferralCapture /></Suspense>
        <HeroSlideshow />

        <section className="section" id="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Featured collection</p>
              <h2>KROON LUXE PICKS</h2>
            </div>
            <a className="text-link" href="/shop">View all pieces</a>
          </div>
          <FirebaseHomePicks />
        </section>

        <EditorialCollections />

        <BrandsLineup />
        <ServiceBenefits />
        <TestimonialCarousel />
      </main>
      <SiteFooter />
    </>
  );
}
