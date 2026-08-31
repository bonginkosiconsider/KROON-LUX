import type { Metadata } from "next";
import { PromoterApplicationClient } from "@/components/firebase/PromoterApplicationClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Promoter Application",
  description: "Apply to become a Kroon Luxe promoter and reserve a unique referral code.",
};

export default function PromoterApplicationPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="simple-hero">
          <p className="eyebrow gold">Promoters</p>
          <h1>Apply for a referral code.</h1>
        </section>
        <PromoterApplicationClient />
      </main>
      <SiteFooter />
    </>
  );
}
