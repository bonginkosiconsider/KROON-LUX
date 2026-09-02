"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify } from "@/lib/firebase-models";

export const defaultCategoryNames = [
  "Uncategorized",
  "Fitted Caps",
  "Automotive",
  "Beauty",
  "Kids & Baby",
  "Electronics",
  "Sports",
  "Fashion",
  "Home & Living",
  "Phones & Accessories",
];

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  source: "default" | "custom";
  canRename: boolean;
  canRemove: boolean;
};

type CategoryRecord = AdminCategory & {
  deleted: boolean;
  sortOrder: number;
};

const categories = collection(db, "categories");
const defaultSlugs = new Map(defaultCategoryNames.map((name, index) => [categorySlug(name), { name, index }]));

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function categorySlug(name: string) {
  return slugify(name) || "category";
}

function defaultCategoryDocId(slug: string) {
  return `default-${slug}`;
}

function recordSlug(value: Record<string, unknown>) {
  return stringValue(value.slug).trim() || categorySlug(stringValue(value.name));
}

function mapCategory(document: QueryDocumentSnapshot): CategoryRecord {
  const data = document.data();
  const name = stringValue(data.name, "Untitled category").trim() || "Untitled category";
  const slug = recordSlug(data);
  const defaultCategory = data.isDefault === true || defaultSlugs.has(slug);

  return {
    id: document.id,
    name,
    slug,
    source: defaultCategory ? "default" : "custom",
    canRename: !defaultCategory,
    canRemove: slug !== "uncategorized",
    deleted: data.deleted === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : defaultSlugs.get(slug)?.index ?? Number.MAX_SAFE_INTEGER,
  };
}

function visibleCategories(records: CategoryRecord[]): AdminCategory[] {
  const hiddenDefaults = new Set(records.filter((item) => item.deleted && item.source === "default").map((item) => item.slug));
  const bySlug = new Map<string, CategoryRecord>();

  defaultCategoryNames.forEach((name, index) => {
    const slug = categorySlug(name);
    if (!hiddenDefaults.has(slug)) {
      bySlug.set(slug, {
        id: `default:${slug}`,
        name,
        slug,
        source: "default",
        canRename: false,
        canRemove: slug !== "uncategorized",
        deleted: false,
        sortOrder: index,
      });
    }
  });

  records.forEach((item) => {
    if (!item.deleted) bySlug.set(item.slug, item);
  });

  return [...bySlug.values()]
    .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      source: item.source,
      canRename: item.canRename,
      canRemove: item.canRemove,
    }));
}

export function subscribeCategories(callback: (items: AdminCategory[]) => void): Unsubscribe {
  return onSnapshot(categories, (snapshot) => {
    callback(visibleCategories(snapshot.docs.map(mapCategory)));
  });
}

export function subscribeCategoryNames(callback: (items: string[]) => void): Unsubscribe {
  return subscribeCategories((items) => callback(items.map((item) => item.name)));
}

async function categoryRecords() {
  const snapshot = await getDocs(categories);
  return snapshot.docs.map(mapCategory);
}

export async function createCategory(nameValue: string) {
  const name = nameValue.trim();
  if (!name) throw new Error("CATEGORY_NAME_REQUIRED");

  const slug = categorySlug(name);
  const records = await categoryRecords();
  const existing = records.find((item) => item.slug === slug);
  const defaultRecord = defaultSlugs.get(slug);

  if (existing && !existing.deleted) throw new Error("CATEGORY_EXISTS");
  if (defaultRecord && !existing) throw new Error("CATEGORY_EXISTS");

  if (existing?.deleted) {
    await updateDoc(doc(db, "categories", existing.id), {
      name: defaultRecord?.name ?? name,
      slug,
      deleted: false,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(categories, {
    name,
    slug,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function productCategoryPatch(data: Record<string, unknown>, fromName: string, toName?: string) {
  const categoriesValue = stringArray(data.categories);
  const nextCategories = categoriesValue
    .map((name) => name === fromName ? toName : name)
    .filter((name): name is string => Boolean(name));
  const uniqueCategories = [...new Set(nextCategories)];
  const primary = stringValue(data.category);
  const nextPrimary = primary === fromName ? toName ?? uniqueCategories[0] ?? "Uncategorized" : primary || uniqueCategories[0] || "Uncategorized";

  return {
    category: nextPrimary,
    categories: uniqueCategories,
    updatedAt: serverTimestamp(),
  };
}

async function productDocsUsingCategory(name: string) {
  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs.filter((document) => {
    const data = document.data();
    return data.category === name || stringArray(data.categories).includes(name);
  });
}

export async function renameCategory(category: AdminCategory, nextNameValue: string) {
  if (!category.canRename || category.id.startsWith("default:")) throw new Error("CATEGORY_NOT_RENAMEABLE");

  const nextName = nextNameValue.trim();
  if (!nextName) throw new Error("CATEGORY_NAME_REQUIRED");

  const slug = categorySlug(nextName);
  const records = await categoryRecords();
  const duplicate = records.find((item) => item.id !== category.id && item.slug === slug && !item.deleted);
  if (duplicate || (defaultSlugs.has(slug) && slug !== category.slug)) throw new Error("CATEGORY_EXISTS");

  const products = await productDocsUsingCategory(category.name);
  const batch = writeBatch(db);
  batch.update(doc(db, "categories", category.id), {
    name: nextName,
    slug,
    updatedAt: serverTimestamp(),
  });
  products.forEach((product) => batch.update(product.ref, productCategoryPatch(product.data(), category.name, nextName)));
  await batch.commit();
}

export async function removeCategory(category: AdminCategory) {
  if (!category.canRemove) throw new Error("CATEGORY_NOT_REMOVEABLE");

  const products = await productDocsUsingCategory(category.name);
  const batch = writeBatch(db);

  products.forEach((product) => batch.update(product.ref, productCategoryPatch(product.data(), category.name)));

  if (category.id.startsWith("default:")) {
    batch.set(doc(db, "categories", defaultCategoryDocId(category.slug)), {
      name: category.name,
      slug: category.slug,
      isDefault: true,
      deleted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else if (category.source === "default") {
    batch.update(doc(db, "categories", category.id), {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.delete(doc(db, "categories", category.id));
  }

  await batch.commit();
}

/** Persist the visual order used by the admin and storefront taxonomy pickers. */
export async function reorderCategories(ordered: AdminCategory[]) {
  const batch = writeBatch(db);
  ordered.forEach((category, index) => {
    const reference = doc(db, "categories", category.id.startsWith("default:") ? defaultCategoryDocId(category.slug) : category.id);
    batch.set(reference, {
      name: category.name,
      slug: category.slug,
      isDefault: category.source === "default",
      deleted: false,
      sortOrder: index,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
}

export function subscribeCategoryProductOrder(slug: string, callback: (ids: string[]) => void): Unsubscribe {
  return onSnapshot(doc(db, "categoryProductOrders", slug), (snapshot) => {
    const value = snapshot.data()?.productIds;
    callback(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
  }, () => callback([]));
}

export async function reorderCategoryProducts(slug: string, productIds: string[]) {
  await setDoc(doc(db, "categoryProductOrders", slug), { productIds, updatedAt: serverTimestamp() }, { merge: true });
}
