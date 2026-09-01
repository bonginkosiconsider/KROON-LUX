"use client";

import Link from "next/link";
import { AuthForms } from "@/components/auth/AuthForms";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useEffect, useState } from "react";
import { dateLabel, type Order } from "@/lib/firebase-models";
import { subscribeCustomerOrders } from "@/services/firebase-orders";

function splitDisplayName(displayName: string | null) {
  const parts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function AccountClient() {
  const { user, profile, loading } = useFirebaseAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => user ? subscribeCustomerOrders(user.uid, setOrders) : undefined, [user]);
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
        {orders.length ? <div className="account-orders">{orders.slice(0, 4).map((order) => <p key={order.id}><strong>#{order.id.slice(0, 10)}</strong><span>{dateLabel(order.createdAt)} · {order.shippingStatus} · R {order.totalAmount.toFixed(2)}</span></p>)}</div> : <p>No orders yet. Your completed orders will appear here.</p>}
        <Link className="text-link" href="/shop">Continue shopping</Link>
      </article>
      <article>
        <p className="eyebrow">Referrals</p>
        <h2>Promoter dashboard</h2>
        <p>Apply for a unique promoter code or check your submitted application status.</p>
        <Link className="text-link" href="/promoters/apply">Open promoter application</Link>
      </article>
    </section>
  );
}
