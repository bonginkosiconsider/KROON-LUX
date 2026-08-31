"use client";

import Link from "next/link";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { formatMoney } from "@/lib/format";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";
import { effectiveVariantPriceInCents, resolveFirebaseCartLines, variantDescriptor } from "@/lib/firebase-product-adapter";

export function FirebaseCheckoutClient() {
  const { user, profile } = useFirebaseAuth();
  const { items } = useFirebaseCart();
  const { products, loading } = useProducts();
  const lines = resolveFirebaseCartLines(products, items);
  const subtotal = lines.reduce((sum, line) => sum + effectiveVariantPriceInCents(line.variant) * line.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 150000 ? 9500 : 0;

  if (loading) return <main className="page-shell"><p>Loading checkout...</p></main>;

  return <main className="page-shell"><section className="simple-hero"><p className="eyebrow gold">Checkout</p><h1>Secure order creation.</h1></section>{!lines.length ? <section className="empty-state"><h2>Your bag needs at least one item.</h2><Link className="button button-dark" href="/shop">Return to shop</Link></section> : <section className="checkout-layout"><CheckoutForm email={profile?.email ?? user?.email} firstName={profile?.firstName} lastName={profile?.lastName} /><aside className="order-summary"><h2>Order summary</h2>{lines.map(({ cartItemId, product, variant, quantity }) => <div className="summary-line" key={cartItemId}><span>{product.title}{product.productType === "variable" ? ` - ${variantDescriptor(variant)}` : ""} x {quantity}</span><strong>{formatMoney(effectiveVariantPriceInCents(variant) * quantity)}</strong></div>)}<dl><div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div><div><dt>Shipping</dt><dd>{formatMoney(shipping)}</dd></div><div className="summary-total"><dt>Total</dt><dd>{formatMoney(subtotal + shipping)}</dd></div></dl></aside></section>}</main>;
}
