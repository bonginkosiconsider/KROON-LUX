"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthForms } from "@/components/auth/AuthForms";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { CouponForm } from "@/components/commerce/CouponForm";
import { useActiveReferral } from "@/hooks/use-active-referral";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatMoney } from "@/lib/format";
import { effectiveVariantPriceInCents, resolveFirebaseCartLines, variantDescriptor } from "@/lib/firebase-product-adapter";
import { shippingCostCents } from "@/lib/shipping";
import { calculateReferralDiscountCents } from "@/services/firebase-referrals";

export function FirebaseCheckoutClient() {
  const { currency } = useStoreSettings();
  const { user, profile, loading: authLoading } = useFirebaseAuth();
  const referral = useActiveReferral(user?.uid);
  const { items } = useFirebaseCart();
  const { products, loading } = useProducts();
  const [tip, setTip] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const lines = resolveFirebaseCartLines(products, items);
  const subtotal = lines.reduce((sum, line) => sum + effectiveVariantPriceInCents(line.variant) * line.quantity, 0);
  const shipping = shippingCostCents(subtotal);
  const discount = user ? calculateReferralDiscountCents(subtotal, referral) : 0;
  const total = Math.max(0, subtotal + shipping - discount + tip);
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);

  if (loading || authLoading) return <main className="checkout-experience"><div className="checkout-loading">Preparing your secure checkout…</div></main>;

  const summary = <aside className="checkout-summary" aria-label="Order summary">
    <div className="checkout-summary-title"><h2>Order summary</h2><span>{itemCount} item{itemCount === 1 ? "" : "s"}</span></div>
    <div className="checkout-products">{lines.map(({ cartItemId, product, variant, quantity }) => <article className="checkout-product" key={cartItemId}>
      <div className="checkout-product-image">{variant.imageUrl ?? product.imageUrls[0] ? <img alt="" src={variant.imageUrl ?? product.imageUrls[0]} /> : <span>KL</span>}<b aria-label={`Quantity ${quantity}`}>{quantity}</b></div>
      <div><h3>{product.title}</h3><p>{product.productType === "variable" ? variantDescriptor(variant) : "Standard"}</p><small>Quantity {quantity}</small></div><strong>{formatMoney(effectiveVariantPriceInCents(variant) * quantity, currency)}</strong>
    </article>)}</div>
    <CouponForm initialCode={referral?.code} label="Discount code" />
    <dl className="checkout-totals"><div><dt>Subtotal</dt><dd>{formatMoney(subtotal, currency)}</dd></div><div><dt>Shipping</dt><dd>{subtotal ? formatMoney(shipping, currency) : "Enter shipping address"}</dd></div>{discount ? <div className="checkout-discount"><dt>Promotion ({referral?.code})</dt><dd>−{formatMoney(discount, currency)}</dd></div> : null}{tip ? <div><dt>Tip</dt><dd>{formatMoney(tip, currency)}</dd></div> : null}<div className="checkout-grand-total"><dt>Total <small>{currency}</small></dt><dd>{formatMoney(total, currency)}</dd></div></dl>
  </aside>;

  return <main className="checkout-experience">{!lines.length ? <section className="checkout-empty"><p>Your bag is currently empty.</p><Link href="/shop">Continue shopping</Link></section> : <>
    <button className="checkout-summary-toggle" type="button" onClick={() => setSummaryOpen(!summaryOpen)} aria-expanded={summaryOpen}><span>Order summary</span><strong>{formatMoney(total, currency)}</strong><span aria-hidden="true">{summaryOpen ? "−" : "+"}</span></button>
    <div className="checkout-mobile-summary" hidden={!summaryOpen}>{summary}</div>
    <div className="checkout-grid"><div className="checkout-main-column">{user ? <CheckoutForm email={profile?.email ?? user.email} firstName={profile?.firstName} lastName={profile?.lastName} subtotal={subtotal} shipping={shipping} currency={currency} onTipChange={setTip} /> : <section className="checkout-signin"><p className="checkout-kicker">Secure checkout</p><h1>Sign in to complete your order.</h1><p>Sign in to securely save your delivery details and complete checkout.</p><AuthForms /></section>}</div><div className="checkout-desktop-summary">{summary}</div></div>
  </>}</main>;
}
