"use client";

import {
  addDoc,
  collection,
  type DocumentData,
  type DocumentSnapshot,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FirestoreTimestamp } from "@/lib/firebase-models";

export type PromoterStatus = "pending" | "approved" | "paused" | "rejected";
export type ReferralSource = "link" | "promo_code" | "checkout";
export type ReferralActivityType = "visit" | "code_entry" | "checkout";
export type ReferralActivityStatus = "captured" | "authenticated" | "converted";

export type Promoter = {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  code: string;
  status: PromoterStatus;
  discountPercent: number;
  notes?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  approvedAt?: FirestoreTimestamp;
  rejectedAt?: FirestoreTimestamp;
};

export type ReferralActivity = {
  id: string;
  promoterId: string;
  promoterCode: string;
  type: ReferralActivityType;
  source: ReferralSource;
  status: ReferralActivityStatus;
  customerId?: string | null;
  visitorId?: string | null;
  orderId?: string | null;
  orderTotal?: number;
  discountAmount?: number;
  discountPercent?: number;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type ActiveReferral = {
  promoterId: string;
  code: string;
  discountPercent: number;
  source: Exclude<ReferralSource, "checkout">;
  capturedAt: number;
  expiresAt: number;
  customerId?: string | null;
  authenticatedAt?: number | null;
};

export type PromoterApplicationInput = {
  name: string;
  email: string;
  code: string;
};

export type AdminPromoterInput = PromoterApplicationInput & {
  discountPercent: number;
};

const promoters = collection(db, "promoters");
const referrals = collection(db, "referrals");
const referralTtlMs = 30 * 24 * 60 * 60 * 1000;
const referralStorageKey = "kroon-luxe-active-referral";
const visitorStorageKey = "kroon-luxe-visitor";
const referralActivityLocks = new Set<string>();

export const referralStorageChanged = "kroon-luxe-referral-changed";

function clampDiscount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePromoterCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

export function validatePromoterCode(value: string) {
  const code = normalizePromoterCode(value);
  if (code.length < 4) return "Use at least 4 letters or numbers.";
  if (code.length > 24) return "Use 24 characters or fewer.";
  return null;
}

export function buildReferralLink(code: string, origin?: string) {
  const base = (origin || (typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL) || "").replace(/\/$/, "");
  return `${base}/ref/${encodeURIComponent(normalizePromoterCode(code))}`;
}

function notifyReferralStorageChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(referralStorageChanged));
}

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(visitorStorageKey);
  if (existing) return existing;

  const generated = typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(visitorStorageKey, generated);
  return generated;
}

export function readStoredReferral(): ActiveReferral | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(referralStorageKey) ?? "null") as Partial<ActiveReferral> | null;
    if (!parsed || typeof parsed.code !== "string" || typeof parsed.promoterId !== "string" || typeof parsed.discountPercent !== "number" || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(referralStorageKey);
      notifyReferralStorageChanged();
      return null;
    }
    return {
      promoterId: parsed.promoterId,
      code: normalizePromoterCode(parsed.code),
      discountPercent: clampDiscount(parsed.discountPercent),
      source: parsed.source === "promo_code" ? "promo_code" : "link",
      capturedAt: typeof parsed.capturedAt === "number" ? parsed.capturedAt : Date.now(),
      expiresAt: parsed.expiresAt,
      customerId: typeof parsed.customerId === "string" ? parsed.customerId : null,
      authenticatedAt: typeof parsed.authenticatedAt === "number" ? parsed.authenticatedAt : null,
    };
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(referralStorageKey);
  notifyReferralStorageChanged();
}

function writeStoredReferral(referral: ActiveReferral) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(referralStorageKey, JSON.stringify(referral));
  notifyReferralStorageChanged();
}

async function addReferralActivity(
  lockKey: string,
  activity: Omit<ReferralActivity, "id" | "createdAt" | "updatedAt">,
) {
  if (referralActivityLocks.has(lockKey)) return false;
  referralActivityLocks.add(lockKey);

  try {
    await addDoc(referrals, {
      ...activity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } finally {
    referralActivityLocks.delete(lockKey);
  }
}

function promoterFromSnapshot(snapshot: DocumentSnapshot<DocumentData>) {
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Promoter) : null;
}

export function subscribePromoters(callback: (promoters: Promoter[]) => void): Unsubscribe {
  return onSnapshot(query(promoters, orderBy("createdAt", "desc")), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Promoter)));
  });
}

export function subscribeReferralActivities(callback: (activities: ReferralActivity[]) => void): Unsubscribe {
  return onSnapshot(query(referrals, orderBy("createdAt", "desc")), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ReferralActivity)));
  });
}

export function subscribePromoterApplications(userId: string, callback: (promoters: Promoter[]) => void): Unsubscribe {
  return onSnapshot(query(promoters, where("userId", "==", userId)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Promoter)));
  });
}

export async function getPromoterByCode(codeInput: string) {
  const code = normalizePromoterCode(codeInput);
  if (!code) return null;
  try {
    return promoterFromSnapshot(await getDoc(doc(db, "promoters", code)));
  } catch {
    return null;
  }
}

export async function getApprovedPromoterByCode(codeInput: string) {
  const promoter = await getPromoterByCode(codeInput);
  return promoter?.status === "approved" ? promoter : null;
}

export async function isPromoterCodeAvailable(codeInput: string) {
  const code = normalizePromoterCode(codeInput);
  if (validatePromoterCode(code)) return false;
  const [codeSnapshot, promoterSnapshot] = await Promise.all([
    getDoc(doc(db, "promoterCodes", code)),
    getDoc(doc(db, "promoters", code)).catch(() => null),
  ]);
  return !codeSnapshot.exists() && !promoterSnapshot?.exists();
}

export async function applyForPromoter(input: PromoterApplicationInput, userId: string) {
  const code = normalizePromoterCode(input.code);
  const codeError = validatePromoterCode(code);
  if (codeError) throw new Error(codeError);

  const promoterRef = doc(db, "promoters", code);
  const codeRef = doc(db, "promoterCodes", code);
  const name = cleanText(input.name);
  const email = input.email.trim().toLowerCase();

  await runTransaction(db, async (transaction) => {
    const [codeSnapshot, promoterSnapshot] = await Promise.all([transaction.get(codeRef), transaction.get(promoterRef)]);
    if (codeSnapshot.exists() || promoterSnapshot.exists()) throw new Error("That promoter code is already taken.");

    transaction.set(promoterRef, {
      userId,
      name,
      email,
      code,
      status: "pending",
      discountPercent: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(codeRef, {
      code,
      promoterId: code,
      status: "pending",
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function createPromoter(input: AdminPromoterInput) {
  const code = normalizePromoterCode(input.code);
  const codeError = validatePromoterCode(code);
  if (codeError) throw new Error(codeError);

  const promoterRef = doc(db, "promoters", code);
  const codeRef = doc(db, "promoterCodes", code);
  const name = cleanText(input.name);
  const email = input.email.trim().toLowerCase();
  const discountPercent = clampDiscount(input.discountPercent);

  await runTransaction(db, async (transaction) => {
    const [codeSnapshot, promoterSnapshot] = await Promise.all([transaction.get(codeRef), transaction.get(promoterRef)]);
    if (codeSnapshot.exists() || promoterSnapshot.exists()) throw new Error("That promoter code is already taken.");

    transaction.set(promoterRef, {
      userId: null,
      name,
      email,
      code,
      status: "approved",
      discountPercent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
    });
    transaction.set(codeRef, {
      code,
      promoterId: code,
      status: "approved",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updatePromoterStatus(promoter: Pick<Promoter, "id" | "code">, status: PromoterStatus) {
  const data: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (status === "approved") data.approvedAt = serverTimestamp();
  if (status === "rejected") data.rejectedAt = serverTimestamp();

  const batch = writeBatch(db);
  batch.update(doc(db, "promoters", promoter.id), data);
  batch.set(doc(db, "promoterCodes", normalizePromoterCode(promoter.code)), {
    code: normalizePromoterCode(promoter.code),
    promoterId: promoter.id,
    status,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

export function updatePromoterDiscount(id: string, discountPercent: number) {
  return updateDoc(doc(db, "promoters", id), { discountPercent: clampDiscount(discountPercent), updatedAt: serverTimestamp() });
}

export async function trackReferralCapture(codeInput: string, source: Exclude<ReferralSource, "checkout">, customerId?: string | null) {
  const promoter = await getApprovedPromoterByCode(codeInput);
  if (!promoter) return { ok: false as const, message: "That promoter code is not active." };

  const activeReferral: ActiveReferral = {
    promoterId: promoter.id,
    code: promoter.code,
    discountPercent: clampDiscount(promoter.discountPercent),
    source,
    capturedAt: Date.now(),
    expiresAt: Date.now() + referralTtlMs,
    customerId: customerId ?? null,
    authenticatedAt: customerId ? Date.now() : null,
  };

  writeStoredReferral(activeReferral);

  try {
    await addReferralActivity(`capture:${source}:${promoter.id}:${customerId ?? "guest"}`, {
      promoterId: promoter.id,
      promoterCode: promoter.code,
      type: source === "link" ? "visit" : "code_entry",
      source,
      status: customerId ? "authenticated" : "captured",
      customerId: customerId ?? null,
      visitorId: getOrCreateVisitorId(),
      discountPercent: activeReferral.discountPercent,
    });
  } catch {
    // Referral state is still stored locally so checkout can apply the code after sign-in.
  }

  return { ok: true as const, referral: activeReferral, promoter };
}

export function calculateReferralDiscountCents(subtotalCents: number, referral: ActiveReferral | null) {
  if (!referral) return 0;
  return Math.min(Math.max(0, subtotalCents), Math.floor((Math.max(0, subtotalCents) * clampDiscount(referral.discountPercent)) / 100));
}

export async function resolveStoredReferral(customerId?: string | null) {
  const stored = readStoredReferral();
  if (!stored) return null;

  const promoter = await getApprovedPromoterByCode(stored.code);
  if (!promoter) {
    clearStoredReferral();
    return null;
  }

  const next: ActiveReferral = {
    ...stored,
    promoterId: promoter.id,
    code: promoter.code,
    discountPercent: clampDiscount(promoter.discountPercent),
  };

  if (customerId && next.customerId !== customerId) {
    const nextWithCustomer = {
      ...next,
      customerId,
      authenticatedAt: Date.now(),
    };
    writeStoredReferral(nextWithCustomer);

    try {
      await addReferralActivity(`auth:${nextWithCustomer.promoterId}:${customerId}`, {
        promoterId: nextWithCustomer.promoterId,
        promoterCode: nextWithCustomer.code,
        type: nextWithCustomer.source === "link" ? "visit" : "code_entry",
        source: nextWithCustomer.source,
        status: "authenticated",
        customerId,
        visitorId: getOrCreateVisitorId(),
        discountPercent: nextWithCustomer.discountPercent,
      });
    } catch {
      // The browser still has the referral state, so checkout can continue.
    }

    return nextWithCustomer;
  }

  if (next.promoterId !== stored.promoterId || next.discountPercent !== stored.discountPercent || next.code !== stored.code) {
    writeStoredReferral(next);
  }

  return next;
}
