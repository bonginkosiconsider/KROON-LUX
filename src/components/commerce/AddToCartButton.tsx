"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddToCartButtonProps = {
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  label?: string;
};

export function AddToCartButton({ variantId, quantity = 1, disabled, label = "Add to bag" }: AddToCartButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function addToCart() {
    if (!variantId) return;
    setStatus("loading");
    const response = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("done");
    router.refresh();
  }

  return (
    <button className="button button-dark" type="button" onClick={addToCart} disabled={disabled || !variantId || status === "loading"}>
      {status === "loading" ? "Adding..." : status === "done" ? "Added" : status === "error" ? "Unavailable" : label}
    </button>
  );
}

