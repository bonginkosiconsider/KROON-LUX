"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify, type ManagedPage, type ManagedPageSection } from "@/lib/firebase-models";

const pages = collection(db, "pages");
export type ManagedPageInput = Pick<ManagedPage, "title" | "slug" | "content" | "status" | "section" | "showInFooter" | "metaTitle" | "metaDescription">;

const initialPages: Array<Omit<ManagedPageInput, "content"> & { content: string }> = [
  { title: "Privacy Policy", slug: "privacy-policy", section: "policies", status: "published", showInFooter: true, metaTitle: "Kroon Luxe Privacy Policy", metaDescription: "Learn how Kroon Luxe collects, uses and protects your information.", content: "<p>Add your privacy policy here.</p>" },
  { title: "Refund Policy", slug: "refund-policy", section: "policies", status: "published", showInFooter: true, metaTitle: "Kroon Luxe Refund Policy", metaDescription: "Read the Kroon Luxe refund policy.", content: "<p>Add your refund policy here.</p>" },
  { title: "Terms of Service", slug: "terms-of-service", section: "policies", status: "published", showInFooter: true, metaTitle: "Kroon Luxe Terms of Service", metaDescription: "Read the Kroon Luxe terms of service.", content: "<p>Add your terms of service here.</p>" },
  { title: "Shipping Policy", slug: "shipping-policy", section: "policies", status: "published", showInFooter: true, metaTitle: "Kroon Luxe Shipping Policy", metaDescription: "Read the Kroon Luxe shipping policy.", content: "<p>Add your shipping policy here.</p>" },
  { title: "Contact Information", slug: "contact-information", section: "pages", status: "published", showInFooter: true, metaTitle: "Contact Kroon Luxe", metaDescription: "Contact Kroon Luxe customer support.", content: "<p>Add your contact details, opening hours and customer support information here.</p>" },
];

function mapPage(id: string, value: Record<string, unknown>): ManagedPage {
  return {
    id, title: typeof value.title === "string" ? value.title : "Untitled page", slug: typeof value.slug === "string" ? value.slug : "",
    content: typeof value.content === "string" ? value.content : "", status: value.status === "published" ? "published" : "draft",
    section: value.section === "pages" ? "pages" : "policies", showInFooter: value.showInFooter === true,
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : Number.MAX_SAFE_INTEGER,
    metaTitle: typeof value.metaTitle === "string" ? value.metaTitle : "", metaDescription: typeof value.metaDescription === "string" ? value.metaDescription : "",
    createdAt: (value.createdAt as ManagedPage["createdAt"]) ?? null, updatedAt: (value.updatedAt as ManagedPage["updatedAt"]) ?? null,
    publishedAt: (value.publishedAt as ManagedPage["publishedAt"]) ?? null,
  };
}

function sortPages(items: ManagedPage[]) { return items.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)); }
function pageData(input: ManagedPageInput) {
  const title = input.title.trim(); const slug = slugify(input.slug || title);
  if (!title || !slug) throw new Error("A page title and URL slug are required.");
  return { ...input, title, slug, content: input.content.trim() || "<p></p>", metaTitle: input.metaTitle?.trim() || "", metaDescription: input.metaDescription?.trim() || "" };
}
async function assertUniqueSlug(slug: string, excludingId?: string) {
  const matches = await getDocs(query(pages, where("slug", "==", slug)));
  if (matches.docs.some((item) => item.id !== excludingId)) throw new Error("That URL slug is already in use.");
}

export function pageHref(page: Pick<ManagedPage, "section" | "slug">) { return `/${page.section}/${page.slug}`; }
export function subscribeManagedPages(callback: (items: ManagedPage[]) => void): Unsubscribe { return onSnapshot(pages, (snapshot) => callback(sortPages(snapshot.docs.map((item) => mapPage(item.id, item.data()))))); }
export function subscribeFooterPages(callback: (items: ManagedPage[]) => void): Unsubscribe { return onSnapshot(query(pages, where("status", "==", "published")), (snapshot) => callback(sortPages(snapshot.docs.map((item) => mapPage(item.id, item.data())).filter((item) => item.showInFooter)))); }
export function subscribePublishedPage(section: ManagedPageSection, slug: string, callback: (page: ManagedPage | null) => void): Unsubscribe { return onSnapshot(query(pages, where("status", "==", "published")), (snapshot) => { const item = snapshot.docs.map((document) => mapPage(document.id, document.data())).find((candidate) => candidate.section === section && candidate.slug === slug); callback(item ?? null); }); }
export async function createManagedPage(input: ManagedPageInput) { const data = pageData(input); await assertUniqueSlug(data.slug); const existing = await getDocs(pages); const sortOrder = existing.docs.reduce((highest, item) => Math.max(highest, Number(item.data().sortOrder) || 0), 0) + 1; await addDoc(pages, { ...data, sortOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), publishedAt: data.status === "published" ? serverTimestamp() : null }); }
export async function updateManagedPage(id: string, input: ManagedPageInput) { const data = pageData(input); await assertUniqueSlug(data.slug, id); await updateDoc(doc(db, "pages", id), { ...data, updatedAt: serverTimestamp(), ...(data.status === "published" ? { publishedAt: serverTimestamp() } : { publishedAt: null }) }); }
export async function deleteManagedPage(id: string) { await deleteDoc(doc(db, "pages", id)); }
export async function moveManagedPage(items: ManagedPage[], id: string, direction: "up" | "down") { const index = items.findIndex((item) => item.id === id); const target = index + (direction === "up" ? -1 : 1); if (index < 0 || target < 0 || target >= items.length) return; const ordered = [...items]; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; const batch = writeBatch(db); ordered.forEach((item, itemIndex) => batch.update(doc(db, "pages", item.id), { sortOrder: itemIndex + 1, updatedAt: serverTimestamp() })); await batch.commit(); }
export async function seedManagedPages() { const current = await getDocs(pages); if (!current.empty) return; const batch = writeBatch(db); initialPages.forEach((page, index) => batch.set(doc(pages), { ...page, sortOrder: index + 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), publishedAt: serverTimestamp() })); await batch.commit(); }
