"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
