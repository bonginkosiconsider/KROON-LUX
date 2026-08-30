"use client";

import { useCallback, useEffect, useState } from "react";

export type FirebaseCartItem = { productId: string; quantity: number };

const cartKey = "kroon-luxe-cart";
const cartChanged = "kroon-luxe-cart-changed";

function readCart(): FirebaseCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(cartKey) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is FirebaseCartItem => typeof item === "object" && item !== null && typeof (item as FirebaseCartItem).productId === "string" && Number.isInteger((item as FirebaseCartItem).quantity) && (item as FirebaseCartItem).quantity > 0) : [];
  } catch { return []; }
}

function writeCart(items: FirebaseCartItem[]) {
  window.localStorage.setItem(cartKey, JSON.stringify(items));
  window.dispatchEvent(new Event(cartChanged));
}

export function addFirebaseCartItem(productId: string, quantity = 1) {
  const items = readCart();
  const current = items.find((item) => item.productId === productId);
  writeCart(current ? items.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item) : [...items, { productId, quantity }]);
}

export function useFirebaseCart() {
  const [items, setItems] = useState<FirebaseCartItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener(cartChanged, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(cartChanged, sync); window.removeEventListener("storage", sync); };
  }, []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const next = readCart().flatMap((item) => item.productId !== productId ? [item] : quantity > 0 ? [{ ...item, quantity }] : []);
    writeCart(next);
  }, []);
  const clear = useCallback(() => writeCart([]), []);
  return { items, itemCount: items.reduce((total, item) => total + item.quantity, 0), updateQuantity, clear };
}
