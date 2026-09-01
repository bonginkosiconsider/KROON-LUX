"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  slugify,
  type BackorderPolicy,
  type Product,
  type ProductAttribute,
  type ProductDimensions,
  type ProductInput,
  type ProductStatus,
  type ProductStockStatus,
  type ProductType,
  type ProductVariation,
  type ProductVisibility,
} from "@/lib/firebase-models";

const products = collection(db, "products");
const productSkus = collection(db, "productSkus");
const productSlugs = collection(db, "productSlugs");

const productTypes: ProductType[] = ["simple", "variable", "grouped", "external", "downloadable", "virtual"];
const stockStatuses: ProductStockStatus[] = ["in-stock", "out-of-stock", "on-backorder"];
const backorderPolicies: BackorderPolicy[] = ["not-allowed", "allowed", "allowed-with-notice"];
const productStatuses: ProductStatus[] = ["draft", "published", "pending-review", "private"];
const productVisibilities: ProductVisibility[] = ["shop-and-search", "shop-only", "search-only", "hidden"];

type ProductRegistryEntry = {
  key: string;
  sku: string;
  productId: string;
  scope: "product" | "variation";
  variationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numericValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asProductType(value: unknown): ProductType {
  return productTypes.includes(value as ProductType) ? value as ProductType : "simple";
}

function asStockStatus(value: unknown): ProductStockStatus {
  const normalized = String(value ?? "").toLowerCase().replace(/_/g, "-");
  if (normalized === "instock") return "in-stock";
  if (normalized === "outofstock") return "out-of-stock";
  return stockStatuses.includes(normalized as ProductStockStatus) ? normalized as ProductStockStatus : "in-stock";
}

function asBackorders(value: unknown): BackorderPolicy {
  return backorderPolicies.includes(value as BackorderPolicy) ? value as BackorderPolicy : "not-allowed";
}

function asProductStatus(value: unknown, published: unknown): ProductStatus {
  if (productStatuses.includes(value as ProductStatus)) return value as ProductStatus;
  return published === false ? "draft" : "published";
}

function asVisibility(value: unknown): ProductVisibility {
  return productVisibilities.includes(value as ProductVisibility) ? value as ProductVisibility : "shop-and-search";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeDimensions(value: unknown): ProductDimensions {
  if (!isRecord(value)) return {};
  return {
    length: optionalNumber(value.length),
    width: optionalNumber(value.width),
    height: optionalNumber(value.height),
  };
}

function normalizeAttributes(value: unknown): ProductAttribute[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = stringValue(item.name).trim();
    const values = Array.isArray(item.values) ? item.values.join(", ") : stringValue(item.values ?? item.value).trim();
    if (!name || !values) return [];
    return [{ name, values, usedForVariations: item.usedForVariations === true }];
  });
}

function normalizeVariationAttributes(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key.trim(), String(item ?? "").trim()])
      .filter(([key, item]) => key && item),
  );
}

function variationLabel(attributes: Record<string, string>) {
  return Object.entries(attributes).map(([name, value]) => `${name}: ${value}`).join(" / ");
}

function normalizeVariation(value: unknown, index: number): ProductVariation {
  const record = isRecord(value) ? value : {};
  const attributes = normalizeVariationAttributes(record.attributes);
  const name = stringValue(record.name).trim() || variationLabel(attributes) || `Variation ${index + 1}`;
  return {
    id: stringValue(record.id).trim() || `${slugify(name) || "variation"}-${index + 1}`,
    name,
    sku: stringValue(record.sku).trim(),
    price: numericValue(record.price ?? record.regularPrice, 0),
    salePrice: optionalNumber(record.salePrice),
    manageStock: record.manageStock !== false,
    inventoryCount: numericValue(record.inventoryCount ?? record.stockQuantity, 0),
    lowStockThreshold: numericValue(record.lowStockThreshold, 5),
    stockStatus: asStockStatus(record.stockStatus),
    imageUrl: stringValue(record.imageUrl).trim(),
    weight: optionalNumber(record.weight),
    dimensions: normalizeDimensions(record.dimensions),
    attributes,
  };
}

function mapProduct(id: string, value: Record<string, unknown>): Product {
  const category = stringValue(value.category, "Uncategorized").trim() || "Uncategorized";
  const status = asProductStatus(value.status, value.isPublished);
  return {
    id,
    title: stringValue(value.title, "Untitled product"),
    slug: stringValue(value.slug, id),
    description: stringValue(value.description),
    price: numericValue(value.price, 0),
    salePrice: optionalNumber(value.salePrice),
    productType: asProductType(value.productType),
    shortDescription: stringValue(value.shortDescription),
    sku: stringValue(value.sku).trim(),
    manageStock: value.manageStock === true,
    stockStatus: asStockStatus(value.stockStatus),
    lowStockThreshold: numericValue(value.lowStockThreshold, 5),
    backorders: asBackorders(value.backorders),
    weight: optionalNumber(value.weight),
    dimensions: normalizeDimensions(value.dimensions),
    shippingClass: stringValue(value.shippingClass),
    attributes: normalizeAttributes(value.attributes),
    variations: Array.isArray(value.variations) ? value.variations.map(normalizeVariation) : [],
    metaTitle: stringValue(value.metaTitle),
    metaDescription: stringValue(value.metaDescription),
    categories: stringArray(value.categories),
    tags: stringArray(value.tags),
    status,
    visibility: asVisibility(value.visibility),
    category,
    brandId: stringValue(value.brandId).trim(),
    brandName: stringValue(value.brandName).trim(),
    collectionIds: stringArray(value.collectionIds),
    inventoryCount: numericValue(value.inventoryCount, 0),
    imageUrls: stringArray(value.imageUrls),
    isPublished: value.isPublished !== false && status === "published",
    featured: value.featured === true,
    createdAt: (value.createdAt as Product["createdAt"]) ?? null,
    updatedAt: (value.updatedAt as Product["updatedAt"]) ?? null,
  };
}

export function subscribeProducts(callback: (products: Product[]) => void, publishedOnly = true): Unsubscribe {
  const source = query(products, orderBy("createdAt", "desc"));
  return onSnapshot(source, (snapshot) => {
    const items = snapshot.docs.map((item) => mapProduct(item.id, item.data()));
    callback(publishedOnly ? items.filter((product) => product.isPublished) : items);
  });
}

export function subscribeProduct(slug: string, callback: (product: Product | null) => void): Unsubscribe {
  return onSnapshot(query(products, where("slug", "==", slug)), (snapshot) => {
    const item = snapshot.docs[0];
    const product = item ? mapProduct(item.id, item.data()) : null;
    callback(product?.isPublished ? product : null);
  });
}

function randomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "X");
}

function categoryCode(value: string) {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  return (code || "GEN").padEnd(3, "X");
}

function normalizeSku(value: unknown) {
  return stringValue(value).trim().toUpperCase().replace(/\s+/g, "-");
}

function skuKey(value: string) {
  return normalizeSku(value).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function generateSku(category: string) {
  return `KRN-${categoryCode(category)}-${randomCode()}`;
}

function variationSkuSuffix(variation: ProductVariation, index: number) {
  const attributeCode = Object.values(variation.attributes ?? {}).map((value) => skuKey(value).slice(0, 6)).filter(Boolean).join("-");
  const nameCode = skuKey(variation.name).slice(0, 18);
  return attributeCode || nameCode || `V${index + 1}`;
}

function resolveStockStatus(manageStock: boolean, quantity: number, backorders: BackorderPolicy, selected?: ProductStockStatus): ProductStockStatus {
  if (!manageStock) return selected ?? "in-stock";
  if (quantity <= 0) return backorders === "not-allowed" ? "out-of-stock" : "on-backorder";
  return selected === "out-of-stock" ? "out-of-stock" : "in-stock";
}

function prepareVariation(variation: ProductVariation, index: number, productId: string, parentSku: string, parentPrice: number, parentLowStock: number): ProductVariation {
  const attributes = normalizeVariationAttributes(variation.attributes);
  const name = variation.name.trim() || variationLabel(attributes) || `Variation ${index + 1}`;
  const prepared: ProductVariation = {
    id: variation.id.trim() || `${productId}-variation-${index + 1}`,
    name,
    sku: normalizeSku(variation.sku) || `${parentSku}-${variationSkuSuffix({ ...variation, name, attributes }, index)}`,
    price: numericValue(variation.price, parentPrice),
    salePrice: optionalNumber(variation.salePrice),
    manageStock: variation.manageStock !== false,
    inventoryCount: numericValue(variation.inventoryCount, 0),
    lowStockThreshold: numericValue(variation.lowStockThreshold, parentLowStock),
    stockStatus: asStockStatus(variation.stockStatus),
    imageUrl: variation.imageUrl?.trim() || undefined,
    weight: optionalNumber(variation.weight),
    dimensions: normalizeDimensions(variation.dimensions),
    attributes,
  };
  return {
    ...prepared,
    stockStatus: resolveStockStatus(Boolean(prepared.manageStock), prepared.inventoryCount, "not-allowed", prepared.stockStatus),
  };
}

function prepareProductInput(input: ProductInput, productId: string): ProductInput & { slug: string; sku: string; variations: ProductVariation[] } {
  const title = input.title.trim();
  const category = input.category?.trim() || input.categories?.[0]?.trim() || "Uncategorized";
  const categories = (input.categories?.length ? input.categories : [category]).map((item) => item.trim()).filter(Boolean);
  const price = numericValue(input.price, 0);
  const lowStockThreshold = numericValue(input.lowStockThreshold, 5);
  const manageStock = input.manageStock === true;
  const inventoryCount = numericValue(input.inventoryCount, 0);
  const backorders = asBackorders(input.backorders);
  const sku = normalizeSku(input.sku) || generateSku(category);
  const productType = asProductType(input.productType);
  const variations = productType === "variable"
    ? (input.variations ?? []).map((variation, index) => prepareVariation(variation, index, productId, sku, price, lowStockThreshold))
    : [];

  return {
    ...input,
    title,
    slug: slugify(input.slug || title) || `product-${productId.slice(0, 8)}`,
    description: input.description ?? "",
    shortDescription: input.shortDescription ?? "",
    price,
    salePrice: optionalNumber(input.salePrice),
    productType,
    sku,
    manageStock,
    inventoryCount,
    lowStockThreshold,
    stockStatus: resolveStockStatus(manageStock, inventoryCount, backorders, input.stockStatus),
    backorders,
    weight: optionalNumber(input.weight),
    dimensions: normalizeDimensions(input.dimensions),
    shippingClass: input.shippingClass?.trim() ?? "",
    attributes: normalizeAttributes(input.attributes),
    variations,
    metaTitle: input.metaTitle?.trim() ?? "",
    metaDescription: input.metaDescription?.trim() ?? "",
    categories,
    category: categories[0] ?? category,
    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    status: asProductStatus(input.status, input.isPublished),
    visibility: asVisibility(input.visibility),
    brandId: input.brandId?.trim() ?? "",
    brandName: input.brandName?.trim() ?? "",
    collectionIds: (input.collectionIds ?? []).map((item) => item.trim()).filter(Boolean),
    isPublished: input.status === "published",
    featured: input.featured === true,
    imageUrls: input.imageUrls ?? [],
  };
}

function productToInput(product: Product): ProductInput {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description,
    price: product.price,
    salePrice: product.salePrice,
    productType: product.productType,
    shortDescription: product.shortDescription,
    sku: product.sku,
    manageStock: product.manageStock,
    stockStatus: product.stockStatus,
    lowStockThreshold: product.lowStockThreshold,
    backorders: product.backorders,
    weight: product.weight,
    dimensions: product.dimensions,
    shippingClass: product.shippingClass,
    attributes: product.attributes,
    variations: product.variations,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    categories: product.categories,
    tags: product.tags,
    status: product.status,
    visibility: product.visibility,
    category: product.category,
    brandId: product.brandId,
    brandName: product.brandName,
    collectionIds: product.collectionIds,
    inventoryCount: product.inventoryCount,
    imageUrls: product.imageUrls,
    isPublished: product.isPublished,
    featured: product.featured,
  };
}

function skuEntries(productId: string, input: ProductInput, enforceUnique = true): ProductRegistryEntry[] {
  const entries: ProductRegistryEntry[] = [];
  const productSku = normalizeSku(input.sku);
  if (productSku) entries.push({ key: skuKey(productSku), sku: productSku, productId, scope: "product" });

  (input.variations ?? []).forEach((variation) => {
    const variationSku = normalizeSku(variation.sku);
    if (variationSku) {
      entries.push({
        key: skuKey(variationSku),
        sku: variationSku,
        productId,
        scope: "variation",
        variationId: variation.id,
      });
    }
  });

  if (enforceUnique) {
    const seen = new Set<string>();
    entries.forEach((entry) => {
      if (seen.has(entry.key)) throw new Error("SKU_ALREADY_EXISTS");
      seen.add(entry.key);
    });
  }
  return entries;
}

function registryRef(entry: ProductRegistryEntry) {
  return doc(productSkus, entry.key);
}

function slugRef(slug: string) {
  return doc(productSlugs, slug);
}

function registryPayload(entry: ProductRegistryEntry) {
  return {
    sku: entry.sku,
    productId: entry.productId,
    scope: entry.scope,
    variationId: entry.variationId ?? null,
    updatedAt: serverTimestamp(),
  };
}

function firestoreValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(firestoreValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)]));
  }
  return value;
}

function firestorePayload(input: ProductInput) {
  return firestoreValue(input) as Record<string, unknown>;
}

export async function createProduct(input: ProductInput) {
  const productRef = doc(products);
  const prepared = prepareProductInput(input, productRef.id);
  const entries = skuEntries(productRef.id, prepared);
  const newSlugRef = slugRef(prepared.slug);

  await runTransaction(db, async (transaction) => {
    const slugSnapshot = await transaction.get(newSlugRef);
    if (slugSnapshot.exists()) throw new Error("SLUG_ALREADY_EXISTS");

    const registrySnapshots = await Promise.all(entries.map((entry) => transaction.get(registryRef(entry))));
    if (registrySnapshots.some((snapshot) => snapshot.exists())) throw new Error("SKU_ALREADY_EXISTS");

    transaction.set(productRef, {
      ...firestorePayload(prepared),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(newSlugRef, { slug: prepared.slug, productId: productRef.id, updatedAt: serverTimestamp() });
    entries.forEach((entry) => transaction.set(registryRef(entry), { ...registryPayload(entry), createdAt: serverTimestamp() }));
  });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const productRef = doc(products, id);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) throw new Error("PRODUCT_NOT_FOUND");

    const current = mapProduct(id, snapshot.data());
    const prepared = prepareProductInput({ ...productToInput(current), ...input }, id);
    const nextEntries = skuEntries(id, prepared);
    const previousEntries = skuEntries(id, productToInput(current), false);
    const nextSlugRef = slugRef(prepared.slug);
    const previousSlugRef = slugRef(current.slug);

    const nextSlugSnapshot = await transaction.get(nextSlugRef);
    if (nextSlugSnapshot.exists() && nextSlugSnapshot.data().productId !== id) throw new Error("SLUG_ALREADY_EXISTS");

    const previousSlugSnapshot = current.slug === prepared.slug ? null : await transaction.get(previousSlugRef);
    const nextRegistrySnapshots = await Promise.all(nextEntries.map((entry) => transaction.get(registryRef(entry))));
    nextRegistrySnapshots.forEach((registrySnapshot) => {
      if (registrySnapshot.exists() && registrySnapshot.data().productId !== id) throw new Error("SKU_ALREADY_EXISTS");
    });

    const nextKeys = new Set(nextEntries.map((entry) => entry.key));
    const previousEntriesToRelease = previousEntries.filter((entry) => !nextKeys.has(entry.key));
    const previousRegistrySnapshots = await Promise.all(previousEntriesToRelease.map((entry) => transaction.get(registryRef(entry))));

    transaction.set(productRef, {
      ...firestorePayload(prepared),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(nextSlugRef, { slug: prepared.slug, productId: id, updatedAt: serverTimestamp() });
    if (previousSlugSnapshot?.exists() && previousSlugSnapshot.data().productId === id) transaction.delete(previousSlugRef);
    nextEntries.forEach((entry) => transaction.set(registryRef(entry), registryPayload(entry), { merge: true }));
    previousEntriesToRelease.forEach((entry, index) => {
      const registrySnapshot = previousRegistrySnapshots[index];
      if (registrySnapshot.exists() && registrySnapshot.data().productId === id) transaction.delete(registryRef(entry));
    });
  });
}

export async function removeProduct(id: string) {
  const productRef = doc(products, id);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists()) return;

    const current = mapProduct(id, snapshot.data());
    const previousEntries = skuEntries(id, productToInput(current), false);
    const currentSlugRef = slugRef(current.slug);
    const slugSnapshot = await transaction.get(currentSlugRef);
    const registrySnapshots = await Promise.all(previousEntries.map((entry) => transaction.get(registryRef(entry))));

    transaction.delete(productRef);
    if (slugSnapshot.exists() && slugSnapshot.data().productId === id) transaction.delete(currentSlugRef);
    previousEntries.forEach((entry, index) => {
      const registrySnapshot = registrySnapshots[index];
      if (registrySnapshot.exists() && registrySnapshot.data().productId === id) transaction.delete(registryRef(entry));
    });
  });
}
