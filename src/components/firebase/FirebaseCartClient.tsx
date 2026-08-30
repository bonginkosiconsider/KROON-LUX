"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";

export function FirebaseCartClient() {
  const { items, updateQuantity } = useFirebaseCart();
  const { products, loading } = useProducts();
  const lines = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product && product.inventoryCount > 0 ? [{ product, quantity: Math.min(item.quantity, product.inventoryCount) }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + Math.round(line.product.price * 100) * line.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 150000 ? 9500 : 0;

  if (loading) return <main className="page-shell"><p>Loading your bag…</p></main>;
  return <main className="page-shell"><section className="simple-hero"><p className="eyebrow gold">Bag</p><h1>Your selected pieces.</h1></section>{!lines.length ? <section className="empty-state"><h2>Your bag is empty.</h2><p>Browse the catalog and add a product to begin checkout.</p><Link className="button button-dark" href="/shop">Shop now</Link></section> : <section className="cart-layout"><div className="cart-lines">{lines.map(({ product, quantity }) => <article className="cart-line" key={product.id}>{product.imageUrls[0] ? <img src={product.imageUrls[0]} alt={product.title} loading="lazy" decoding="async" /> : <div className="product-image-empty" aria-hidden="true" />}<div><p className="eyebrow">{product.sku || product.category}</p><h2>{product.title}</h2><div className="quantity-control" aria-label={`Quantity for ${product.title}`}><button type="button" onClick={() => updateQuantity(product.id, quantity - 1)}>-</button><span>{quantity}</span><button type="button" disabled={quantity >= product.inventoryCount} onClick={() => updateQuantity(product.id, quantity + 1)}>+</button><button className="text-button" type="button" onClick={() => updateQuantity(product.id, 0)}>Remove</button></div></div><strong>{formatMoney(Math.round(product.price * 100) * quantity)}</strong></article>)}</div><aside className="order-summary"><h2>Order summary</h2><dl><div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div><div><dt>Shipping</dt><dd>{formatMoney(shipping)}</dd></div><div className="summary-total"><dt>Total</dt><dd>{formatMoney(subtotal + shipping)}</dd></div></dl><Link className="button button-dark" href="/checkout">Checkout securely</Link></aside></section>}</main>;
}
