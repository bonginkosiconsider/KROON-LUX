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
  heroAutoplaySeconds: number;
  featuredProductIds: string[];
  socialLinks: SocialLink[];
};

export type SocialPlatform = "whatsapp" | "tiktok" | "facebook" | "instagram";
export type SocialLink = { platform: SocialPlatform; url: string; enabled: boolean };

export type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  altText: string;
  headline: string;
  brandId: string;
  ctaText: string;
  sortOrder: number;
  enabled: boolean;
  textPosition: "left" | "center" | "right";
};

const defaultHeroSlides: HeroSlide[] = [
  {
    id: "white-trainers",
    imageUrl: "/hero/white-trainers.png",
    altText: "White trainers from the Kroon Luxe footwear edit",
    headline: "THE FOOTWEAR EDIT",
    brandId: "",
    ctaText: "SHOP THE COLLECTION",
    sortOrder: 1,
    enabled: true,
    textPosition: "left",
  },
  {
    id: "white-sneakers",
    imageUrl: "/hero/white-sneakers.png",
    altText: "White sneakers styled for the Kroon Luxe collection",
    headline: "ELEVATED ESSENTIALS",
    brandId: "",
    ctaText: "SHOP THE COLLECTION",
    sortOrder: 2,
    enabled: true,
    textPosition: "left",
  },
  {
    id: "green-swoosh-trainers",
    imageUrl: "/hero/green-swoosh-trainers.png",
    altText: "Green-accented trainers in a studio setting",
    headline: "MADE TO MOVE",
    brandId: "",
    ctaText: "SHOP THE COLLECTION",
    sortOrder: 3,
    enabled: true,
    textPosition: "center",
  },
  {
    id: "luxe-polo-edit",
    imageUrl: "/hero/luxe-polo-edit.png",
    altText: "Models wearing premium black and green polo styles",
    headline: "THE MODERN CLASSIC",
    brandId: "",
    ctaText: "SHOP THE COLLECTION",
    sortOrder: 4,
    enabled: true,
    textPosition: "right",
  },
];

export const defaultSocialLinks: SocialLink[] = [
  { platform: "whatsapp", url: "", enabled: false },
  { platform: "tiktok", url: "", enabled: false },
  { platform: "facebook", url: "", enabled: false },
  { platform: "instagram", url: "", enabled: false },
];

export const defaultStoreSettings: StoreSettings = {
  storeName: "KROON LUXE",
  contactEmail: "",
  contactPhone: "",
  currency: "ZAR",
  announcement: "",
  heroSlides: defaultHeroSlides,
  heroAutoplaySeconds: 6,
  featuredProductIds: [],
  socialLinks: defaultSocialLinks,
};

const settingsRef = doc(db, "settings", "store");

export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): Unsubscribe {
  return onSnapshot(settingsRef, (snapshot) => {
    const data = snapshot.data() as Partial<StoreSettings> | undefined;
    const heroSlides = Array.isArray(data?.heroSlides) && data.heroSlides.every((slide) => typeof slide?.id === "string")
      ? data.heroSlides.map((slide, index) => ({
        ...defaultHeroSlides[index % defaultHeroSlides.length],
        ...slide,
        id: typeof slide?.id === "string" ? slide.id : `hero-slide-${index + 1}`,
        imageUrl: typeof slide?.imageUrl === "string" ? slide.imageUrl : "",
        altText: typeof slide?.altText === "string" ? slide.altText : "",
        headline: typeof slide?.headline === "string" ? slide.headline : "",
        brandId: typeof slide?.brandId === "string" ? slide.brandId : "",
        ctaText: typeof slide?.ctaText === "string" ? slide.ctaText : "SHOP THE COLLECTION",
        sortOrder: typeof slide?.sortOrder === "number" ? slide.sortOrder : index + 1,
        enabled: slide?.enabled !== false,
        textPosition: (slide?.textPosition === "center" || slide?.textPosition === "right" ? slide.textPosition : "left") as HeroSlide["textPosition"],
      }))
      : defaultHeroSlides;
    const socialLinks = Array.isArray(data?.socialLinks)
      ? defaultSocialLinks.map((fallback) => ({ ...fallback, ...data.socialLinks?.find((link) => link?.platform === fallback.platform) }))
      : defaultSocialLinks;
    const featuredProductIds = Array.isArray(data?.featuredProductIds)
      ? [...new Set(data.featuredProductIds.filter((id): id is string => typeof id === "string" && id.trim()).map((id) => id.trim()))]
      : [];

    callback({ ...defaultStoreSettings, ...data, heroSlides, heroAutoplaySeconds: Math.min(15, Math.max(3, Number(data?.heroAutoplaySeconds) || 6)), featuredProductIds, socialLinks });
  });
}

export function saveStoreSettings(settings: StoreSettings) {
  return setDoc(settingsRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}
