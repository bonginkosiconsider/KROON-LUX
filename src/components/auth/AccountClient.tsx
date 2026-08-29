"use client";

import Link from "next/link";
import { AuthForms } from "@/components/auth/AuthForms";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

function splitDisplayName(displayName: string | null) {
  const parts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function AccountClient() {
  const { user, profile, loading } = useFirebaseAuth();
  const fallbackName = splitDisplayName(user?.displayName ?? null);
  const firstName = profile?.firstName ?? fallbackName.firstName;
  const lastName = profile?.lastName ?? fallbackName.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || user?.email || "Customer";

  if (loading) {
    return (
      <section className="auth-panel">
        <p className="form-message">Checking account...</p>
      </section>
    );
  }

  if (!user) return <AuthForms />;

  return (
    <section className="account-grid">
      <article>
        <p className="eyebrow">Profile</p>
        <h2>{fullName}</h2>
        <p>{profile?.email ?? user.email}</p>
        <p>{user.emailVerified ? "Email verified" : "Email verification pending"}</p>
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
  );
}
