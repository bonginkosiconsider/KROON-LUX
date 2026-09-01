"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Testimonial } from "@/lib/firebase-models";

const testimonials = collection(db, "testimonials");
export const maxTestimonials = 6;
export type TestimonialInput = Pick<Testimonial, "customerName" | "message" | "rating" | "imageUrl" | "active">;

function mapTestimonial(id: string, value: Record<string, unknown>): Testimonial {
  return { id, customerName: typeof value.customerName === "string" ? value.customerName : "Customer", message: typeof value.message === "string" ? value.message : "", rating: Math.min(5, Math.max(1, Number(value.rating) || 5)), imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "", active: value.active !== false, sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : Number.MAX_SAFE_INTEGER, createdAt: (value.createdAt as Testimonial["createdAt"]) ?? null, updatedAt: (value.updatedAt as Testimonial["updatedAt"]) ?? null };
}

function sort(items: Testimonial[]) { return items.sort((a, b) => a.sortOrder - b.sortOrder || a.customerName.localeCompare(b.customerName)); }
export function subscribeTestimonials(callback: (items: Testimonial[]) => void): Unsubscribe { return onSnapshot(testimonials, (snapshot) => callback(sort(snapshot.docs.map((item) => mapTestimonial(item.id, item.data()))))); }
export async function createTestimonial(input: TestimonialInput) {
  const existing = await getDocs(testimonials);
  if (existing.size >= maxTestimonials) throw new Error("Maximum of 6 testimonials reached.");
  const customerName = input.customerName.trim(); const message = input.message.trim();
  if (!customerName || !message) throw new Error("Customer name and testimonial are required.");
  const sortOrder = existing.docs.reduce((highest, item) => Math.max(highest, Number(item.data().sortOrder) || 0), 0) + 1;
  await addDoc(testimonials, { customerName, message, rating: Math.min(5, Math.max(1, input.rating)), imageUrl: input.imageUrl?.trim() || "", active: input.active !== false, sortOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateTestimonial(id: string, input: TestimonialInput) {
  const customerName = input.customerName.trim(); const message = input.message.trim();
  if (!customerName || !message) throw new Error("Customer name and testimonial are required.");
  await updateDoc(doc(db, "testimonials", id), { customerName, message, rating: Math.min(5, Math.max(1, input.rating)), imageUrl: input.imageUrl?.trim() || "", active: input.active !== false, updatedAt: serverTimestamp() });
}
export async function removeTestimonial(id: string) { await deleteDoc(doc(db, "testimonials", id)); }
export async function moveTestimonial(items: Testimonial[], id: string, direction: "up" | "down") {
  const currentIndex = items.findIndex((item) => item.id === id); const targetIndex = currentIndex + (direction === "up" ? -1 : 1);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;
  const reordered = [...items]; [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
  const batch = writeBatch(db); reordered.forEach((item, index) => batch.update(doc(db, "testimonials", item.id), { sortOrder: index + 1, updatedAt: serverTimestamp() })); await batch.commit();
}
