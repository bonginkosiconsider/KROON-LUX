"use client";

import { FormEvent, useState } from "react";

type CheckoutFormProps = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function CheckoutForm({ email, firstName, lastName }: CheckoutFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setMessage(body?.error?.message ?? "Checkout could not be created.");
      return;
    }
    setMessage(`Order ${body.data.order.orderNumber} is pending payment. Server-side payment verification can now be connected.`);
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
      <button className="button button-dark" type="submit" disabled={pending}>
        {pending ? "Creating secure order..." : "Continue to payment"}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}

