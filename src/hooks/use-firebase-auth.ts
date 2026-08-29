"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/firebase-models";

type CustomerProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

const bootstrapAdminEmails = (process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isBootstrapAdmin(user: User | null) {
  return Boolean(user?.email && bootstrapAdminEmails.includes(user.email.toLowerCase()));
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapAdmin = isBootstrapAdmin(user);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
    if (!nextUser) setProfile(null);
  }), []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null));
  }, [user]);

  return { user, profile, loading, isAdmin: bootstrapAdmin || profile?.role === "admin", isBootstrapAdmin: bootstrapAdmin };
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function ensureCustomerProfile(user: User, profile: CustomerProfileInput = {}) {
  const firstName = cleanOptional(profile.firstName);
  const lastName = cleanOptional(profile.lastName);
  const phone = cleanOptional(profile.phone);
  const data: Record<string, unknown> = {
    email: user.email ?? "",
    role: "customer",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (phone) data.phone = phone;

  await setDoc(doc(db, "users", user.uid), data, { merge: true });
}

export async function ensureAdminProfile(user: User) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email ?? "",
      role: "admin",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
