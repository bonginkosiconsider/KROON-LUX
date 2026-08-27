"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CouponForm({ initialCode }: { initialCode?: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const couponCode = String(new FormData(event.currentTarget).get("couponCode") ?? "");
    startTransition(async () => {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: couponCode || null }),
      });
      setMessage(response.ok ? null : "Coupon could not be applied.");
      router.refresh();
    });
  }

  return (
    <form className="coupon-form" onSubmit={submit}>
      <label>
        Promotional code
        <input name="couponCode" defaultValue={initialCode ?? ""} placeholder="KROON10" />
      </label>
      <button className="button button-outline" type="submit" disabled={pending}>
        Apply
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}

