"use client";

import { useEffect, useState } from "react";
import { defaultCategoryNames, subscribeCategoryNames } from "@/services/firebase-categories";

export function useAdminCategories() {
  const [categories, setCategories] = useState(defaultCategoryNames);
  useEffect(() => subscribeCategoryNames(setCategories), []);
  return categories;
}
