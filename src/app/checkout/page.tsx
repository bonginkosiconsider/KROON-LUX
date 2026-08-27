import Link from "next/link";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";
import { readCart } from "@/server/cart/service";

export default async function CheckoutPage() {
  const [user, cart] = await Promise.all([getCurrentUser().catch(() => null), readCart().catch(() => null)]);

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="simple-hero">
          <p className="eyebrow gold">Checkout</p>
          <h1>Secure order creation.</h1>
        </section>

        {!cart || cart.items.length === 0 ? (
          <section className="empty-state">
            <h2>Your bag needs at least one item.</h2>
            <Link className="button button-dark" href="/shop">
              Return to shop
            </Link>
          </section>
        ) : (
          <section className="checkout-layout">
            <CheckoutForm email={user?.email} firstName={user?.firstName} lastName={user?.lastName} />
            <aside className="order-summary">
              <h2>Order summary</h2>
              {cart.items.map((item) => (
                <div className="summary-line" key={item.id}>
                  <span>{item.product.name} x {item.quantity}</span>
                  <strong>{formatMoney(item.lineTotalCents)}</strong>
                </div>
              ))}
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
                <div className="summary-total">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.totalCents)}</dd>
                </div>
              </dl>
            </aside>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

