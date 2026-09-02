"use client";

import Link from "next/link";
import { CouponForm } from "@/components/commerce/CouponForm";
import { useActiveReferral } from "@/hooks/use-active-referral";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";
import { formatMoney, formatMoneyPrecise } from "@/lib/format";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { FREE_SHIPPING_THRESHOLD_CENTS, shippingCostCents } from "@/lib/shipping";
import {
  calculateReferralDiscountCents,
} from "@/services/firebase-referrals";
import {
  effectiveVariantPriceInCents,
  resolveFirebaseCartLines,
  variantAvailableQuantity,
  variantDescriptor,
} from "@/lib/firebase-product-adapter";

export function FirebaseCartClient() {
  const { currency } = useStoreSettings();
  const { user } = useFirebaseAuth();
  const referral = useActiveReferral(user?.uid);
  const { items, updateQuantity } = useFirebaseCart();
  const { products, loading } = useProducts();
  const lines = resolveFirebaseCartLines(products, items);
  const subtotal = lines.reduce((sum, line) => sum + effectiveVariantPriceInCents(line.variant) * line.quantity, 0);
  const shipping = shippingCostCents(subtotal);
  const shippingMessage = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? "You are eligible for free shipping." : `Spend ${formatMoneyPrecise(FREE_SHIPPING_THRESHOLD_CENTS - subtotal, currency)} more for free shipping.`;
  const discount = user ? calculateReferralDiscountCents(subtotal, referral) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  if (loading) return <main className="page-shell"><p>Loading your bag...</p></main>;

  return (
    <main className="page-shell">
      <section className="simple-hero">
        <h1 className="cart-page-title">CART</h1>
      </section>
      {!lines.length ? (
        <section className="empty-state">
          <h2>Your bag is empty.</h2>
          <p>Browse the catalog and add a product to begin checkout.</p>
          <Link className="button button-dark" href="/shop">
            Shop now
          </Link>
        </section>
      ) : (
        <section className="cart-layout">
          <p className="free-shipping-message">{shippingMessage}</p>
          <div className="cart-lines">
            {lines.map(({ cartItemId, product, variant, quantity }) => {
              const available = variantAvailableQuantity(variant);
              const imageUrl = variant.imageUrl || product.imageUrls[0];

              return (
                <article className="cart-line" key={cartItemId}>
                  {imageUrl ? <img src={imageUrl} alt={product.title} loading="lazy" decoding="async" /> : <div className="product-image-empty" aria-hidden="true" />}
                  <div>
                    <p className="eyebrow">{variant.sku || product.category}</p>
                    <h2>{product.title}</h2>
                    {product.productType === "variable" ? <small>{variantDescriptor(variant)}</small> : null}
                    <div className="quantity-control" aria-label={`Quantity for ${product.title}`}>
                      <button type="button" onClick={() => updateQuantity(cartItemId, quantity - 1)}>
                        -
                      </button>
                      <span>{quantity}</span>
                      <button type="button" disabled={quantity >= available} onClick={() => updateQuantity(cartItemId, quantity + 1)}>
                        +
                      </button>
                      <button className="text-button" type="button" onClick={() => updateQuantity(cartItemId, 0)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong>{formatMoney(effectiveVariantPriceInCents(variant) * quantity, currency)}</strong>
                </article>
              );
            })}
          </div>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <CouponForm initialCode={referral?.code} />
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(subtotal, currency)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{formatMoney(shipping, currency)}</dd>
              </div>
              {referral ? (
                <div>
                  <dt>{user ? `${referral.code} referral` : "Referral pending"}</dt>
                  <dd>{user ? `-${formatMoney(discount, currency)}` : "Sign in"}</dd>
                </div>
              ) : null}
              <div className="summary-total">
                <dt>Total</dt>
                <dd>{formatMoney(total, currency)}</dd>
              </div>
            </dl>
            <Link className="button button-dark" href="/checkout">
              Checkout securely
            </Link>
          </aside>
        </section>
      )}
    </main>
  );
}
