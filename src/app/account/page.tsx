import Link from "next/link";
import { AuthForms } from "@/components/auth/AuthForms";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCurrentUser } from "@/server/auth/session";

export default async function AccountPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="simple-hero">
          <p className="eyebrow gold">Account</p>
          <h1>{user ? `Welcome, ${user.firstName}.` : "Your Kroon account."}</h1>
        </section>

        {user ? (
          <section className="account-grid">
            <article>
              <p className="eyebrow">Profile</p>
              <h2>{user.firstName} {user.lastName}</h2>
              <p>{user.email}</p>
              <p>{user.emailVerifiedAt ? "Email verified" : "Email verification pending"}</p>
              <LogoutButton />
            </article>
            <article>
              <p className="eyebrow">Orders</p>
              <h2>Order history</h2>
              <p>Customer-owned order history is backed by `/api/orders/*` in the planned delivery sequence.</p>
              <Link className="text-link" href="/cart">View bag</Link>
            </article>
            <article>
              <p className="eyebrow">Referrals</p>
              <h2>Promoter dashboard</h2>
              <p>Approved promoters will see click, order, revenue, and commission reporting here.</p>
            </article>
          </section>
        ) : (
          <AuthForms />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

