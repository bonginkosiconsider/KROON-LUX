"use client";

import { useState } from "react";
import { addFirebaseCartItem } from "@/hooks/use-firebase-cart";

type AddToCartButtonProps = {
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  label?: string;
};

export function AddToCartButton({ variantId, quantity = 1, disabled, label = "Add to bag" }: AddToCartButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function addToCart() {
    if (!variantId) return;
    setStatus("loading");
    try { addFirebaseCartItem(variantId, quantity); setStatus("done"); }
    catch { setStatus("error"); }
  }

  return (
    <button className="button button-dark" type="button" onClick={addToCart} disabled={disabled || !variantId || status === "loading"}>
      {status === "loading" ? "Adding..." : status === "done" ? "Added" : status === "error" ? "Unavailable" : label}
    </button>
  );
}

