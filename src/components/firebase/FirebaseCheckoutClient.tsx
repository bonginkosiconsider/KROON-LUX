"use client";

import Link from "next/link";
import { AuthForms } from "@/components/auth/AuthForms";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { CouponForm } from "@/components/commerce/CouponForm";
import { useActiveReferral } from "@/hooks/use-active-referral";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";
import { formatMoney } from "@/lib/format";
import {
  calculateReferralDiscountCents,
} from "@/services/firebase-referrals";
import {
  effectiveVariantPriceInCents,
  resolveFirebaseCartLines,
  variantDescriptor,
} from "@/lib/firebase-product-adapter";

export function FirebaseCheckoutClient() {
  const { user, profile, loading: authLoading } = useFirebaseAuth();
  const referral = useActiveReferral(user?.uid);
  const { items } = useFirebaseCart();
  const { products, loading } = useProducts();
  const lines = resolveFirebaseCartLines(products, items);
  const subtotal = lines.reduce((sum, line) => sum + effectiveVariantPriceInCents(line.variant) * line.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 150000 ? 9500 : 0;
  const discount = user ? calculateReferralDiscountCents(subtotal, referral) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  if (loading || authLoading) return <main className="page-shell"><p>Loading checkout...</p></main>;

  return (
    <main className="page-shell">
      <section className="simple-hero">
        <p className="eyebrow gold">Checkout</p>
        <h1>Secure order creation.</h1>
      </section>
      {!lines.length ? (
        <section className="empty-state">
          <h2>Your bag needs at least one item.</h2>
          <Link className="button button-dark" href="/shop">
            Return to shop
          </Link>
        </section>
      ) : (
        <section className="checkout-layout">
          {user ? (
            <CheckoutForm email={profile?.email ?? user.email} firstName={profile?.firstName} lastName={profile?.lastName} />
          ) : (
            <div>
              <section className="auth-panel checkout-auth-panel">
                <p className="eyebrow">Account required</p>
                <h2>Sign in to activate checkout.</h2>
                <p className="form-message">Referral discounts are applied to customer accounts before payment.</p>
              </section>
              <AuthForms />
            </div>
          )}
          <aside className="order-summary">
            <h2>Order summary</h2>
            {lines.map(({ cartItemId, product, variant, quantity }) => (
              <div className="summary-line" key={cartItemId}>
                <span>
                  {product.title}
                  {product.productType === "variable" ? ` - ${variantDescriptor(variant)}` : ""} x {quantity}
                </span>
                <strong>{formatMoney(effectiveVariantPriceInCents(variant) * quantity)}</strong>
              </div>
            ))}
            <CouponForm initialCode={referral?.code} />
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{formatMoney(shipping)}</dd>
              </div>
              {referral ? (
                <div>
                  <dt>{user ? `${referral.code} referral` : "Referral pending"}</dt>
                  <dd>{user ? `-${formatMoney(discount)}` : "Sign in"}</dd>
                </div>
              ) : null}
              <div className="summary-total">
                <dt>Total</dt>
                <dd>{formatMoney(total)}</dd>
              </div>
            </dl>
          </aside>
        </section>
      )}
    </main>
  );
}
