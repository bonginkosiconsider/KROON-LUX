"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify, type StoreTaxonomy } from "@/lib/firebase-models";

export type TaxonomyKind = "brands" | "collections";
type TaxonomyInput = Pick<StoreTaxonomy, "name" | "description"> & { slug?: string };

function mapTaxonomy(id: string, value: Record<string, unknown>): StoreTaxonomy {
  const name = String(value.name ?? "Untitled");
  return {
    id,
    name,
    slug: String(value.slug ?? slugify(name)),
    description: typeof value.description === "string" ? value.description : "",
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : Number.MAX_SAFE_INTEGER,
    createdAt: (value.createdAt as StoreTaxonomy["createdAt"]) ?? null,
    updatedAt: (value.updatedAt as StoreTaxonomy["updatedAt"]) ?? null,
  };
}

export function subscribeTaxonomies(kind: TaxonomyKind, callback: (items: StoreTaxonomy[]) => void): Unsubscribe {
  return onSnapshot(collection(db, kind), (snapshot) => {
    callback(snapshot.docs.map((item) => mapTaxonomy(item.id, item.data())).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
  });
}

export function subscribeTaxonomyBySlug(kind: TaxonomyKind, slug: string, callback: (item: StoreTaxonomy | null) => void): Unsubscribe {
  return onSnapshot(query(collection(db, kind), where("slug", "==", slug)), (snapshot) => {
    const item = snapshot.docs[0];
    callback(item ? mapTaxonomy(item.id, item.data()) : null);
  });
}

export async function createTaxonomy(kind: TaxonomyKind, input: TaxonomyInput) {
  const name = input.name.trim();
  if (!name) throw new Error("A name is required.");
  const existing = await getDocs(collection(db, kind));
  const sortOrder = existing.docs.reduce((highest, item) => Math.max(highest, Number(item.data().sortOrder) || 0), 0) + 1;
  await addDoc(collection(db, kind), {
    name,
    slug: input.slug?.trim() || slugify(name),
    description: input.description?.trim() || "",
    sortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function moveTaxonomy(kind: TaxonomyKind, items: StoreTaxonomy[], id: string, direction: "up" | "down") {
  const currentIndex = items.findIndex((item) => item.id === id);
  const targetIndex = currentIndex + (direction === "up" ? -1 : 1);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;
  const reordered = [...items];
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
  const batch = writeBatch(db);
  reordered.forEach((item, index) => batch.update(doc(db, kind, item.id), { sortOrder: index + 1, updatedAt: serverTimestamp() }));
  await batch.commit();
}

export async function updateTaxonomy(kind: TaxonomyKind, id: string, input: TaxonomyInput) {
  const name = input.name.trim();
  if (!name) throw new Error("A name is required.");
  await updateDoc(doc(db, kind, id), {
    name,
    slug: input.slug?.trim() || slugify(name),
    description: input.description?.trim() || "",
    updatedAt: serverTimestamp(),
  });

  if (kind === "brands") {
    const assignedProducts = await getDocs(query(collection(db, "products"), where("brandId", "==", id)));
    const batch = writeBatch(db);
    assignedProducts.docs.forEach((product) => batch.update(product.ref, { brandName: name, updatedAt: serverTimestamp() }));
    if (!assignedProducts.empty) await batch.commit();
  }
}

export async function removeTaxonomy(kind: TaxonomyKind, id: string) {
  const assignmentQuery = kind === "brands"
    ? query(collection(db, "products"), where("brandId", "==", id))
    : query(collection(db, "products"), where("collectionIds", "array-contains", id));
  const assignedProducts = await getDocs(assignmentQuery);
  const batch = writeBatch(db);
  assignedProducts.docs.forEach((product) => {
    if (kind === "brands") batch.update(product.ref, { brandId: "", brandName: "", updatedAt: serverTimestamp() });
    else {
      const collectionIds = (product.data().collectionIds as string[] | undefined) ?? [];
      batch.update(product.ref, { collectionIds: collectionIds.filter((collectionId) => collectionId !== id), updatedAt: serverTimestamp() });
    }
  });
  if (!assignedProducts.empty) await batch.commit();
  await deleteDoc(doc(db, kind, id));
}
