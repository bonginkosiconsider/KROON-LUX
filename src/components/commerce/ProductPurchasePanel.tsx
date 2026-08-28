"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { formatMoney } from "@/lib/format";

type Variant = { id: string; name: string; priceInCents: number; salePriceCents: number | null; stockQuantity: number; reservedStock: number; size: string | null; color: string | null };

export function ProductPurchasePanel({ variants }: { variants: Variant[] }) {
  const firstAvailable = variants.find((variant) => variant.stockQuantity - variant.reservedStock > 0) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? "");
  const selected = useMemo(() => variants.find((variant) => variant.id === selectedId) ?? firstAvailable, [firstAvailable, selectedId, variants]);
  const available = selected ? selected.stockQuantity - selected.reservedStock : 0;
  const price = selected?.salePriceCents ?? selected?.priceInCents ?? 0;

  return (
    <div className="purchase-panel">
      <p className="product-price">{formatMoney(price)}</p>
      <label>
        Select your variation
        <select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} disabled={variants.length === 0}>
          {variants.map((variant) => {
            const quantity = variant.stockQuantity - variant.reservedStock;
            const descriptor = [variant.color, variant.size].filter(Boolean).join(" / ") || variant.name;
            return <option key={variant.id} value={variant.id} disabled={quantity <= 0}>{descriptor} - {quantity > 0 ? `${quantity} available` : "Sold out"}</option>;
          })}
        </select>
      </label>
      <div className="purchase-action">
        <AddToCartButton variantId={selected?.id ?? null} disabled={available <= 0} label={available > 0 ? "Add selected piece" : "Sold out"} />
        {selected ? <span>{available > 0 ? `${available} ready to ship` : "This variation is unavailable"}</span> : null}
      </div>
    </div>
  );
}
