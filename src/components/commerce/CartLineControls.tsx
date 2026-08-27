"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type CartLineControlsProps = {
  itemId: string;
  quantity: number;
  availableQuantity: number;
};

export function CartLineControls({ itemId, quantity, availableQuantity }: CartLineControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function updateQuantity(nextQuantity: number) {
    startTransition(async () => {
      await fetch(`/api/cart/items/${itemId}`, {
        method: nextQuantity <= 0 ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: nextQuantity <= 0 ? undefined : JSON.stringify({ quantity: nextQuantity }),
      });
      router.refresh();
    });
  }

  return (
    <div className="quantity-control" aria-label="Cart item quantity">
      <button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={pending}>
        -
      </button>
      <span>{quantity}</span>
      <button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={pending || quantity >= availableQuantity}>
        +
      </button>
      <button className="text-button" type="button" onClick={() => updateQuantity(0)} disabled={pending}>
        Remove
      </button>
    </div>
  );
}

