"use client";

import { FormEvent, useState } from "react";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useFirebaseCart } from "@/hooks/use-firebase-cart";
import { useProducts } from "@/hooks/use-products";
import { resolveFirebaseCartLines } from "@/lib/firebase-product-adapter";
import { createFirebaseCheckout } from "@/services/firebase-orders";

type CheckoutFormProps = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function CheckoutForm({ email, firstName, lastName }: CheckoutFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { user } = useFirebaseAuth();
  const { items, clear } = useFirebaseCart();
  const { products } = useProducts();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const lines = resolveFirebaseCartLines(products, items);
    const total = lines.reduce((sum, line) => sum + (line.variant.salePrice ?? line.variant.price) * line.quantity, 0) + (lines.length ? 95 : 0);
    try {
      await createFirebaseCheckout({ firstName: String(formData.get("firstName")), lastName: String(formData.get("lastName")), email: String(formData.get("email")), phone: String(formData.get("phone") || ""), address: [formData.get("address"), formData.get("apartment"), formData.get("city"), formData.get("province"), formData.get("postalCode"), formData.get("country")].filter(Boolean).join(", ") }, lines.map(({ product, variant, quantity }) => ({ productId: product.id, variationId: variant.variationId, title: product.productType === "variable" ? `${product.title} - ${variant.name}` : product.title, quantity, unitPrice: variant.salePrice ?? variant.price, sku: variant.sku, attributes: variant.attributes, imageUrl: variant.imageUrl ?? product.imageUrls[0] })), total);
      clear();
      setMessage("Order created successfully. It is pending payment confirmation.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout could not be created."); }
    finally { setPending(false); }
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          First name
          <input name="firstName" defaultValue={firstName ?? ""} required />
        </label>
        <label>
          Last name
          <input name="lastName" defaultValue={lastName ?? ""} required />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={email ?? ""} required />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" />
        </label>
      </div>
      <label>
        Address
        <input name="address" autoComplete="shipping address-line1" required />
      </label>
      <label>
        Apartment, suite or building
        <input name="apartment" autoComplete="shipping address-line2" />
      </label>
      <div className="form-grid">
        <label>
          City
          <input name="city" autoComplete="shipping address-level2" required />
        </label>
        <label>
          Province
          <input name="province" autoComplete="shipping address-level1" required />
        </label>
        <label>
          Postal code
          <input name="postalCode" autoComplete="shipping postal-code" required />
        </label>
        <label>
          Country
          <input name="country" defaultValue="South Africa" autoComplete="shipping country-name" required />
        </label>
      </div>
      {!user ? <p className="form-message">Please sign in before placing your order.</p> : null}
      <button className="button button-dark" type="submit" disabled={pending || !user}>
        {pending ? "Creating secure order..." : "Continue to payment"}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}

