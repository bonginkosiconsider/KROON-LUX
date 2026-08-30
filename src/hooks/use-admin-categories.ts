"use client";

import { useEffect, useState } from "react";
import { subscribeAdminCollection } from "@/services/firebase-admin-data";

const defaults = ["Fitted Caps", "Automotive", "Beauty", "Kids & Baby", "Electronics", "Sports", "Fashion", "Home & Living", "Phones & Accessories"];

export function useAdminCategories() {
  const [categories, setCategories] = useState(defaults);
  useEffect(() => subscribeAdminCollection("categories", (records) => {
    const custom = records.map((record) => String(record.name ?? "").trim()).filter(Boolean);
    setCategories([...new Set([...defaults, ...custom])]);
  }), []);
  return categories;
}
