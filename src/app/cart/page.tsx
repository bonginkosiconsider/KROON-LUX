import Link from "next/link";
import { CartLineControls } from "@/components/commerce/CartLineControls";
import { CouponForm } from "@/components/commerce/CouponForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatMoney } from "@/lib/format";
import { readCart } from "@/server/cart/service";

export default async function CartPage() {
  const cart = await readCart().catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="simple-hero">
          <p className="eyebrow gold">Bag</p>
          <h1>Your selected pieces.</h1>
        </section>

        {!cart || cart.items.length === 0 ? (
          <section className="empty-state">
            <h2>Your bag is empty.</h2>
            <p>Browse the catalog and add a variation to begin checkout.</p>
            <Link className="button button-dark" href="/shop">
              Shop now
            </Link>
          </section>
        ) : (
          <section className="cart-layout">
            <div className="cart-lines">
              {cart.items.map((item) => (
                <article className="cart-line" key={item.id}>
                  {item.variant.imageUrl || item.product.images[0]?.url ? (
                    <img src={item.variant.imageUrl ?? item.product.images[0]?.url} alt={item.product.images[0]?.altText ?? item.product.name} loading="lazy" decoding="async" />
                  ) : (
                    <div className="product-image-empty" aria-hidden="true" />
                  )}
                  <div>
                    <p className="eyebrow">{item.variant.sku}</p>
                    <h2>{item.product.name}</h2>
                    <p>{[item.variant.color, item.variant.size].filter(Boolean).join(" / ") || item.variant.name}</p>
                    <CartLineControls itemId={item.id} quantity={item.quantity} availableQuantity={item.availableQuantity} />
                  </div>
                  <strong>{formatMoney(item.lineTotalCents)}</strong>
                </article>
              ))}
            </div>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <CouponForm initialCode={cart.coupon.code} />
              {cart.coupon.message ? <p className="form-message">{cart.coupon.message}</p> : null}
              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(cart.subtotalCents)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>{formatMoney(cart.discountCents)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{formatMoney(cart.shippingCents)}</dd>
                </div>
                <div>
                  <dt>Tax</dt>
                  <dd>{formatMoney(cart.taxCents)}</dd>
                </div>
                <div className="summary-total">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.totalCents)}</dd>
                </div>
              </dl>
              <Link className="button button-dark" href="/checkout">
                Checkout securely
              </Link>
            </aside>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

