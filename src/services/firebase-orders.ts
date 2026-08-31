"use client";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Order } from "@/lib/firebase-models";
import {
  calculateReferralDiscountCents,
  clearStoredReferral,
  resolveStoredReferral,
} from "@/services/firebase-referrals";

type CheckoutInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
};

function centsToAmount(cents: number) {
  return Math.round(cents) / 100;
}

function itemSubtotalCents(items: Order["items"]) {
  return items.reduce((sum, item) => sum + Math.round(Math.max(0, item.unitPrice) * 100) * item.quantity, 0);
}

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

export async function createFirebaseCheckout(input: CheckoutInput, items: Order["items"]) {
  const customer = auth.currentUser;
  if (!customer) throw new Error("Please sign in before placing your order.");
  if (!items.length) throw new Error("Your bag is empty.");

  const activeReferral = await resolveStoredReferral();
  const subtotalCents = itemSubtotalCents(items);
  const shippingCents = subtotalCents > 0 && subtotalCents < 150000 ? 9500 : 0;
  const discountCents = calculateReferralDiscountCents(subtotalCents, activeReferral);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  const orderRef = doc(collection(db, "orders"));
  const batch = writeBatch(db);
  const orderData: Omit<Order, "id" | "createdAt" | "updatedAt"> = {
    customerId: customer.uid,
    customer: {
      name: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      phone: input.phone,
      address: input.address,
    },
    items,
    subtotalAmount: centsToAmount(subtotalCents),
    shippingAmount: centsToAmount(shippingCents),
    discountAmount: centsToAmount(discountCents),
    totalAmount: centsToAmount(totalCents),
    referralCode: activeReferral?.code ?? null,
    promoterId: activeReferral?.promoterId ?? null,
    referralDiscountPercent: activeReferral?.discountPercent ?? null,
    paymentStatus: "pending",
    shippingStatus: "pending",
  };

  batch.set(orderRef, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (activeReferral) {
    batch.set(doc(collection(db, "referrals")), {
      promoterId: activeReferral.promoterId,
      promoterCode: activeReferral.code,
      type: "checkout",
      source: "checkout",
      status: "converted",
      customerId: customer.uid,
      orderId: orderRef.id,
      orderTotal: orderData.totalAmount,
      discountAmount: orderData.discountAmount,
      discountPercent: activeReferral.discountPercent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  if (activeReferral) clearStoredReferral();
  return orderRef;
}
