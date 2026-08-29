import { AccountClient } from "@/components/auth/AccountClient";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default async function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="simple-hero">
          <p className="eyebrow gold">Account</p>
          <h1>Your Kroon account.</h1>
        </section>

        <AccountClient />
      </main>
      <SiteFooter />
    </>
  );
}
