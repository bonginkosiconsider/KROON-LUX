"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { formatMoney } from "@/lib/format";
import { effectiveVariantPriceInCents, variantAvailableQuantity, variantDescriptor } from "@/lib/firebase-product-adapter";

export type PurchasePanelVariant = {
  id: string;
  name: string;
  priceInCents: number;
  salePriceCents: number | null;
  stockQuantity: number;
  reservedStock: number;
  stockStatus?: "in-stock" | "out-of-stock" | "on-backorder";
  manageStock?: boolean;
  size?: string | null;
  color?: string | null;
  imageUrl?: string;
  attributes?: Record<string, string>;
};

function variantAttributes(variant: PurchasePanelVariant) {
  const attributes = { ...(variant.attributes ?? {}) };
  if (variant.color && !Object.keys(attributes).some((key) => key.toLowerCase() === "color")) attributes.Color = variant.color;
  if (variant.size && !Object.keys(attributes).some((key) => key.toLowerCase() === "size")) attributes.Size = variant.size;
  return attributes;
}

function priceRangeLabel(variants: PurchasePanelVariant[]) {
  const prices = variants.map((variant) => effectiveVariantPriceInCents({ priceInCents: variant.priceInCents, salePriceCents: variant.salePriceCents ?? null })).filter(Number.isFinite);
  if (!prices.length) return formatMoney(0);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`;
}

export function ProductPurchasePanel<T extends PurchasePanelVariant>({ variants, onVariantChange }: { variants: T[]; onVariantChange?: (variant: T | null) => void }) {
  const firstAvailable = variants.find((variant) => variantAvailableQuantity(variant) > 0) ?? variants[0] ?? null;
  const [selectedId, setSelectedId] = useState(() => variants.length <= 1 ? firstAvailable?.id ?? "" : "");
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string>>({});
  const selected = useMemo(() => {
    if (variants.length <= 1) return firstAvailable;
    return variants.find((variant) => variant.id === selectedId) ?? null;
  }, [firstAvailable, selectedId, variants]);
  const available = selected ? variantAvailableQuantity(selected) : 0;
  const attributeNames = useMemo(() => [...new Set(variants.flatMap((variant) => Object.keys(variantAttributes(variant))))], [variants]);
  const price = selected ? formatMoney(effectiveVariantPriceInCents(selected)) : priceRangeLabel(variants);

  function selectAttribute(name: string, value: string) {
    const next = { ...attributeSelections, [name]: value };
    setAttributeSelections(next);

    const isComplete = attributeNames.every((attributeName) => next[attributeName]);
    const match = isComplete
      ? variants.find((variant) => {
          const attributes = variantAttributes(variant);
          return attributeNames.every((attributeName) => attributes[attributeName] === next[attributeName]);
        })
      : null;

    setSelectedId(match?.id ?? "");
    onVariantChange?.(match ?? null);
  }

  function selectVariantId(id: string) {
    const match = variants.find((variant) => variant.id === id) ?? null;
    setSelectedId(id);
    setAttributeSelections(match ? variantAttributes(match) : {});
    onVariantChange?.(match);
  }

  function optionValues(name: string) {
    return [...new Set(variants.map((variant) => variantAttributes(variant)[name]).filter(Boolean))];
  }

  const stockLabel = !selected
    ? "Choose options for availability"
    : selected.stockStatus === "on-backorder"
      ? "Available on backorder"
      : available > 0
        ? selected.manageStock === false ? "In stock" : `${available} ready to ship`
        : "This variation is unavailable";

  return (
    <div className="purchase-panel">
      <p className="product-price">{price}</p>
      {variants.length > 1 && attributeNames.length ? (
        <div className="variant-options">
          {attributeNames.map((name) => (
            <label key={name}>
              {name}
              <select value={attributeSelections[name] ?? ""} onChange={(event) => selectAttribute(name, event.target.value)}>
                <option value="">Choose {name.toLowerCase()}</option>
                {optionValues(name).map((value) => <option key={`${name}-${value}`} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : variants.length > 1 ? (
        <label>
          Select your variation
          <select value={selected?.id ?? ""} onChange={(event) => selectVariantId(event.target.value)} disabled={variants.length === 0}>
            <option value="">Choose an option</option>
            {variants.map((variant) => {
              const quantity = variantAvailableQuantity(variant);
              return <option key={variant.id} value={variant.id} disabled={quantity <= 0}>{variantDescriptor({ attributes: variant.attributes ?? {}, color: variant.color ?? null, size: variant.size ?? null, name: variant.name })} - {quantity > 0 ? variant.manageStock === false ? "In stock" : `${quantity} available` : "Sold out"}</option>;
            })}
          </select>
        </label>
      ) : null}
      <div className="purchase-action">
        <AddToCartButton variantId={selected?.id ?? null} disabled={!selected || available <= 0} label={!selected ? "Choose options" : available > 0 ? "Add selected piece" : "Sold out"} />
        <span>{stockLabel}</span>
      </div>
    </div>
  );
}
