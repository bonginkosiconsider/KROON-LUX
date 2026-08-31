"use client";

import { useEffect, useState } from "react";
import {
  readStoredReferral,
  referralStorageChanged,
  resolveStoredReferral,
  type ActiveReferral,
} from "@/services/firebase-referrals";

export function useActiveReferral(refreshKey?: string | null) {
  const [referral, setReferral] = useState<ActiveReferral | null>(() => readStoredReferral());

  useEffect(() => {
    let active = true;

    resolveStoredReferral(refreshKey ?? null)
      .then((nextReferral) => {
        if (active) setReferral(nextReferral);
      })
      .catch(() => {
        if (active) setReferral(readStoredReferral());
      });

    const syncReferral = () => setReferral(readStoredReferral());
    window.addEventListener(referralStorageChanged, syncReferral);
    window.addEventListener("storage", syncReferral);

    return () => {
      active = false;
      window.removeEventListener(referralStorageChanged, syncReferral);
      window.removeEventListener("storage", syncReferral);
    };
  }, [refreshKey]);

  return referral;
}
