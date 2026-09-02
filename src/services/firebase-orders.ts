"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  increment,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Order } from "@/lib/firebase-models";
import { shippingCostCents } from "@/lib/shipping";
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
  apartment?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  tipCents?: number;
  billing?: { firstName: string; lastName: string; address: string; city?: string; province?: string; postalCode?: string; country?: string };
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

export function subscribeCustomerOrders(customerId: string, callback: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "orders"), where("customerId", "==", customerId)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Order)).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)));
  });
}

export function updateOrderShippingStatus(id: string, shippingStatus: Order["shippingStatus"]) {
  return updateDoc(doc(db, "orders", id), { shippingStatus, updatedAt: serverTimestamp(), activity: arrayUnion({ action: `Status changed to ${shippingStatus}`, at: new Date().toISOString() }) });
}

export function updateOrderDetails(id: string, values: Pick<Order, "trackingNumber" | "notes">) {
  return updateDoc(doc(db, "orders", id), { ...values, updatedAt: serverTimestamp(), ...(values.trackingNumber ? { activity: arrayUnion({ action: `Tracking number updated to ${values.trackingNumber}`, at: new Date().toISOString() }) } : {}) });
}

export function createOrder(order: Omit<Order, "id" | "createdAt" | "updatedAt"> & { customerId: string }) {
  return addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function createFirebaseCheckout(input: CheckoutInput, items: Order["items"]) {
  const customer = auth.currentUser;
  if (!customer) throw new Error("Please sign in before placing your order.");
  if (!items.length) throw new Error("Your bag is empty.");

  const activeReferral = await resolveStoredReferral(customer.uid);
  const subtotalCents = itemSubtotalCents(items);
  const shippingCents = shippingCostCents(subtotalCents);
  const discountCents = calculateReferralDiscountCents(subtotalCents, activeReferral);
  const tipCents = Math.max(0, Math.round(input.tipCents ?? 0));
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents + tipCents);
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
    shippingAddress: {
      name: `${input.firstName} ${input.lastName}`.trim(),
      address: [input.address, input.apartment].filter(Boolean).join(", "),
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country,
    },
    billingAddress: input.billing ? {
      name: `${input.billing.firstName} ${input.billing.lastName}`.trim(), address: input.billing.address, city: input.billing.city, province: input.billing.province, postalCode: input.billing.postalCode, country: input.billing.country,
    } : {
      name: `${input.firstName} ${input.lastName}`.trim(),
      address: [input.address, input.apartment].filter(Boolean).join(", "),
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country,
    },
    items,
    subtotalAmount: centsToAmount(subtotalCents),
    shippingAmount: centsToAmount(shippingCents),
    taxAmount: 0,
    discountAmount: centsToAmount(discountCents),
    tipAmount: centsToAmount(tipCents),
    totalAmount: centsToAmount(totalCents),
    referralCode: activeReferral?.code ?? null,
    promoterId: activeReferral?.promoterId ?? null,
    referralDiscountPercent: activeReferral?.discountPercent ?? null,
    paymentStatus: "pending",
    paymentGateway: "Pending payment",
    shippingStatus: "pending",
  };

  batch.set(orderRef, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (activeReferral) {
    batch.set(doc(db, "promoters", activeReferral.promoterId), { totalSales: increment(orderData.totalAmount), updatedAt: serverTimestamp() }, { merge: true });
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
    batch.set(doc(db, "referralRedemptions", `${activeReferral.promoterId}_${customer.uid}`), {
      status: "used",
      promoterId: activeReferral.promoterId,
      referralCode: activeReferral.code,
      customerId: customer.uid,
      orderId: orderRef.id,
      usedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  if (activeReferral) clearStoredReferral();
  return orderRef;
}
