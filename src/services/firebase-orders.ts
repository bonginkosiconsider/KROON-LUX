"use client";

import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/firebase-models";

export function subscribeOrders(callback: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Order)));
  });
}

export function updateOrderShippingStatus(id: string, shippingStatus: Order["shippingStatus"]) {
  return updateDoc(doc(db, "orders", id), { shippingStatus, updatedAt: serverTimestamp() });
}

export function createOrder(order: Omit<Order, "id" | "createdAt" | "updatedAt"> & { customerId: string }) {
  return addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
