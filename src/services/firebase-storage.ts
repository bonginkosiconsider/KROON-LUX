"use client";

import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each product image must be 5 MB or smaller.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `products/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}

export async function uploadHeroImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each hero image must be 5 MB or smaller.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `hero/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}

export async function uploadBrandLogo(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each brand logo must be 5 MB or smaller.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `brands/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}

export async function removeBrandLogo(url: string) {
  if (!url) return;
  await deleteObject(ref(storage, url));
}

export async function uploadTestimonialImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each customer image must be 5 MB or smaller.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const uploaded = await uploadBytes(ref(storage, `testimonials/${crypto.randomUUID()}-${safeName}`), file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}

export async function removeTestimonialImage(url: string) { if (url) await deleteObject(ref(storage, url)); }
