"use client";

import { useEffect, useState } from "react";
import { defaultStoreSettings, subscribeStoreSettings } from "@/services/firebase-settings";

/** Live storefront configuration shared by customer-facing components. */
export function useStoreSettings() {
  const [settings, setSettings] = useState(defaultStoreSettings);

  useEffect(() => subscribeStoreSettings(setSettings), []);

  return settings;
}
