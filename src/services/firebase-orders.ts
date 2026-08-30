"use client";

import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/firebase-models";
import { auth } from "@/lib/firebase";

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

export async function createFirebaseCheckout(input: { firstName: string; lastName: string; email: string; phone?: string; address: string }, items: Order["items"], totalAmount: number) {
  const customer = auth.currentUser;
  if (!customer) throw new Error("Please sign in before placing your order.");
  if (!items.length) throw new Error("Your bag is empty.");
  return createOrder({ customerId: customer.uid, customer: { name: `${input.firstName} ${input.lastName}`.trim(), email: input.email, phone: input.phone, address: input.address }, items, totalAmount, paymentStatus: "pending", shippingStatus: "pending" });
}
