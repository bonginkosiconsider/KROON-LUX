"use client";

import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Referral = {
  id: string;
  name: string;
  email: string;
  code: string;
  status: "active" | "paused";
  clicks: number;
  conversions: number;
  commissionRate: number;
  commissionTotal: number;
};

const referrals = collection(db, "referrals");

export function subscribeReferrals(callback: (referrals: Referral[]) => void): Unsubscribe {
  return onSnapshot(query(referrals, orderBy("createdAt", "desc")), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Referral)));
  });
}

export function createReferral(input: Omit<Referral, "id" | "clicks" | "conversions" | "commissionTotal">) {
  return addDoc(referrals, { ...input, clicks: 0, conversions: 0, commissionTotal: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateReferralStatus(id: string, status: Referral["status"]) {
  return updateDoc(doc(db, "referrals", id), { status, updatedAt: serverTimestamp() });
}
