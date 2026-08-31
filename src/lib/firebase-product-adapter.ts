import type { Product, ProductStockStatus, ProductVariation } from "@/lib/firebase-models";

const backorderStockQuantity = 999;
const untrackedStockQuantity = 999;

export type FirebaseProductVariant = {
  id: string;
  productId: string;
  variationId?: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  priceInCents: number;
  salePriceCents: number | null;
  manageStock: boolean;
  stockQuantity: number;
  reservedStock: number;
  stockStatus: ProductStockStatus;
  imageUrl?: string;
  attributes: Record<string, string>;
  size: string | null;
  color: string | null;
};

export type FirebaseCartLine = {
  cartItemId: string;
  product: Product;
  variant: FirebaseProductVariant;
  quantity: number;
};

function cents(value: number | undefined) {
  return Math.round(Math.max(0, value ?? 0) * 100);
}

function attributeValue(attributes: Record<string, string>, key: string) {
  const match = Object.entries(attributes).find(([name]) => name.toLowerCase() === key);
  return match?.[1] ?? null;
}

function productCategory(product: Product) {
  return product.categories?.[0] || product.category || "Uncategorized";
}

function categorySlug(category: string) {
  return category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "uncategorized";
}

function stockQuantity(manageStock: boolean, quantity: number, status: ProductStockStatus) {
  if (status === "on-backorder") return Math.max(Math.floor(quantity), backorderStockQuantity);
  if (!manageStock) return status === "out-of-stock" ? 0 : untrackedStockQuantity;
  return Math.max(0, Math.floor(quantity));
}

function productStockStatus(product: Product): ProductStockStatus {
  if (product.stockStatus) return product.stockStatus;
  if (product.manageStock && product.inventoryCount <= 0) return "out-of-stock";
  return "in-stock";
}

function variationStockStatus(variation: ProductVariation): ProductStockStatus {
  if (variation.stockStatus) return variation.stockStatus;
  if (variation.manageStock !== false && variation.inventoryCount <= 0) return "out-of-stock";
  return "in-stock";
}

export function firebasePurchasableId(productId: string, variationId?: string) {
  return variationId ? `${productId}::${variationId}` : productId;
}

export function productPurchasables(product: Product): FirebaseProductVariant[] {
  if (product.productType === "variable" && product.variations?.length) {
    return product.variations.map((variation) => {
      const attributes = variation.attributes ?? {};
      const status = variationStockStatus(variation);
      const manageStock = variation.manageStock !== false;
      const quantity = stockQuantity(manageStock, variation.inventoryCount, status);

      return {
        id: firebasePurchasableId(product.id, variation.id),
        productId: product.id,
        variationId: variation.id,
        name: variation.name,
        sku: variation.sku || product.sku || product.slug,
        price: variation.price,
        salePrice: variation.salePrice,
        priceInCents: cents(variation.price),
        salePriceCents: variation.salePrice === undefined ? null : cents(variation.salePrice),
        manageStock,
        stockQuantity: quantity,
        reservedStock: 0,
        stockStatus: status,
        imageUrl: variation.imageUrl || product.imageUrls[0],
        attributes,
        size: attributeValue(attributes, "size"),
        color: attributeValue(attributes, "color"),
      };
    });
  }

  const status = productStockStatus(product);
  const manageStock = product.manageStock === true;
  const quantity = stockQuantity(manageStock, product.inventoryCount, status);

  return [{
    id: firebasePurchasableId(product.id),
    productId: product.id,
    name: product.title,
    sku: product.sku || product.slug,
    price: product.price,
    salePrice: product.salePrice,
    priceInCents: cents(product.price),
    salePriceCents: product.salePrice === undefined ? null : cents(product.salePrice),
    manageStock,
    stockQuantity: quantity,
    reservedStock: 0,
    stockStatus: status,
    imageUrl: product.imageUrls[0],
    attributes: {},
    size: null,
    color: null,
  }];
}

export function firebaseProductCard(product: Product) {
  const category = productCategory(product);

  return {
    name: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription || product.description,
    images: product.imageUrls.map((url) => ({ url, altText: product.title })),
    category: { name: category, slug: categorySlug(category) },
    variants: productPurchasables(product),
  };
}

export function effectiveVariantPriceInCents(variant: Pick<FirebaseProductVariant, "priceInCents" | "salePriceCents">) {
  return variant.salePriceCents ?? variant.priceInCents;
}

export function variantAvailableQuantity(variant: Pick<FirebaseProductVariant, "stockQuantity" | "reservedStock">) {
  return Math.max(0, variant.stockQuantity - variant.reservedStock);
}

export function variantDescriptor(variant: Pick<FirebaseProductVariant, "attributes" | "color" | "size" | "name">) {
  const values = Object.values(variant.attributes ?? {}).filter(Boolean);
  return values.join(" / ") || [variant.color, variant.size].filter(Boolean).join(" / ") || variant.name;
}

export function productGalleryUrls(product: Product, variant?: Pick<FirebaseProductVariant, "imageUrl"> | null) {
  const urls = [variant?.imageUrl, ...product.imageUrls].filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

export function resolveFirebaseCartLine(products: Product[], item: { productId: string; quantity: number }): FirebaseCartLine | null {
  for (const product of products) {
    const variants = productPurchasables(product);
    const direct = variants.find((variant) => variant.id === item.productId);
    const fallback = product.id === item.productId ? variants.find((variant) => variantAvailableQuantity(variant) > 0) ?? variants[0] : undefined;
    const variant = direct ?? fallback;

    if (!variant) continue;

    const available = variantAvailableQuantity(variant);
    if (available <= 0) return null;

    return {
      cartItemId: item.productId,
      product,
      variant,
      quantity: Math.min(item.quantity, available),
    };
  }

  return null;
}

export function resolveFirebaseCartLines(products: Product[], items: { productId: string; quantity: number }[]) {
  return items.flatMap((item) => {
    const line = resolveFirebaseCartLine(products, item);
    return line ? [line] : [];
  });
}
