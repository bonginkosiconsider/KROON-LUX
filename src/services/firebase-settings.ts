"use client";

import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type StoreSettings = {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  announcement: string;
  heroSlides: HeroSlide[];
};

export type HeroSlide = {
  imageUrl: string;
  linkUrl: string;
  altText: string;
};

const defaultHeroSlides: HeroSlide[] = [
  {
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2200&q=88",
    linkUrl: "/shop",
    altText: "Model wearing a Kroon Luxe seasonal look",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2200&q=88",
    linkUrl: "/shop?sort=newest",
    altText: "A considered selection of Kroon Luxe pieces",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88",
    linkUrl: "/shop?sort=featured",
    altText: "Modern heirlooms from the Kroon Luxe collection",
  },
];

export const defaultStoreSettings: StoreSettings = {
  storeName: "KROON LUXE",
  contactEmail: "",
  contactPhone: "",
  currency: "ZAR",
  announcement: "",
  heroSlides: defaultHeroSlides,
};

const settingsRef = doc(db, "settings", "store");

export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): Unsubscribe {
  return onSnapshot(settingsRef, (snapshot) => {
    const data = snapshot.data() as Partial<StoreSettings> | undefined;
    const heroSlides = Array.isArray(data?.heroSlides)
      ? defaultHeroSlides.map((fallback, index) => ({ ...fallback, ...data.heroSlides?.[index] }))
      : defaultHeroSlides;

    callback({ ...defaultStoreSettings, ...data, heroSlides });
  });
}

export function saveStoreSettings(settings: StoreSettings) {
  return setDoc(settingsRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}
