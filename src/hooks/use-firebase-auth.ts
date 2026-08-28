"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/firebase-models";

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
    if (!nextUser) setProfile(null);
  }), []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null));
  }, [user]);

  return { user, profile, loading, isAdmin: profile?.role === "admin" };
}

export async function ensureCustomerProfile(user: User) {
  await setDoc(doc(db, "users", user.uid), { email: user.email ?? "", role: "customer", createdAt: serverTimestamp() }, { merge: true });
}
