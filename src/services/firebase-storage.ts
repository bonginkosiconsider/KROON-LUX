"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `products/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}
