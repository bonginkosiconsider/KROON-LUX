"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function createFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const auth = getAuth(firebaseApp);
function createFirestore() {
  if (typeof window === "undefined") return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db = createFirestore();
export const storage = getStorage(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!firebaseConfig.measurementId || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  analyticsPromise ??= isSupported()
    .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
    .catch(() => null);
  return analyticsPromise;
}
