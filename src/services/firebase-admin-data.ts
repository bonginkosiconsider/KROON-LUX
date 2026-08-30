"use client";

import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminRecord = { id: string; [key: string]: unknown };

export function subscribeAdminCollection(name: string, callback: (records: AdminRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, name), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
}

export function addAdminRecord(name: string, value: Record<string, unknown>) {
  return addDoc(collection(db, name), { ...value, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateAdminRecord(name: string, id: string, value: Record<string, unknown>) {
  return updateDoc(doc(db, name, id), { ...value, updatedAt: serverTimestamp() });
}
