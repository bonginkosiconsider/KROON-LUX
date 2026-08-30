"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify, type Product, type ProductInput } from "@/lib/firebase-models";

const products = collection(db, "products");

function mapProduct(id: string, value: Record<string, unknown>): Product {
  return {
    id,
    title: String(value.title ?? "Untitled product"),
    slug: String(value.slug ?? id),
    description: String(value.description ?? ""),
    price: Number(value.price ?? 0),
    salePrice: value.salePrice === undefined ? undefined : Number(value.salePrice),
    productType: (value.productType as Product["productType"]) ?? "simple",
    shortDescription: String(value.shortDescription ?? ""),
    sku: String(value.sku ?? ""),
    stockStatus: (value.stockStatus as Product["stockStatus"]) ?? "in-stock",
    backorders: (value.backorders as Product["backorders"]) ?? "not-allowed",
    weight: value.weight === undefined ? undefined : Number(value.weight),
    dimensions: (value.dimensions as Product["dimensions"]) ?? {},
    shippingClass: String(value.shippingClass ?? ""),
    attributes: Array.isArray(value.attributes) ? value.attributes as Product["attributes"] : [],
    variations: Array.isArray(value.variations) ? value.variations as Product["variations"] : [],
    metaTitle: String(value.metaTitle ?? ""),
    metaDescription: String(value.metaDescription ?? ""),
    categories: Array.isArray(value.categories) ? value.categories.filter((item): item is string => typeof item === "string") : [],
    tags: Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [],
    status: (value.status as Product["status"]) ?? (value.isPublished === false ? "draft" : "published"),
    visibility: (value.visibility as Product["visibility"]) ?? "shop-and-search",
    category: String(value.category ?? "Uncategorized"),
    inventoryCount: Number(value.inventoryCount ?? 0),
    imageUrls: Array.isArray(value.imageUrls) ? value.imageUrls.filter((url): url is string => typeof url === "string") : [],
    isPublished: value.isPublished !== false,
    featured: value.featured === true,
    createdAt: (value.createdAt as Product["createdAt"]) ?? null,
    updatedAt: (value.updatedAt as Product["updatedAt"]) ?? null,
  };
}

export function subscribeProducts(callback: (products: Product[]) => void, publishedOnly = true): Unsubscribe {
  const source = publishedOnly ? query(products, where("isPublished", "==", true), orderBy("createdAt", "desc")) : query(products, orderBy("createdAt", "desc"));
  return onSnapshot(source, (snapshot) => callback(snapshot.docs.map((item) => mapProduct(item.id, item.data()))));
}

export function subscribeProduct(slug: string, callback: (product: Product | null) => void): Unsubscribe {
  return onSnapshot(query(products, where("slug", "==", slug), where("isPublished", "==", true)), (snapshot) => {
    const item = snapshot.docs[0];
    callback(item ? mapProduct(item.id, item.data()) : null);
  });
}

export async function createProduct(input: ProductInput) {
  const title = input.title.trim();
  await addDoc(products, { ...input, title, slug: input.slug?.trim() || slugify(title), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const title = input.title?.trim();
  await updateDoc(doc(db, "products", id), { ...input, ...(title ? { title, slug: input.slug?.trim() || slugify(title) } : {}), updatedAt: serverTimestamp() });
}

export async function removeProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
}
