"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { normalizePromoterCode, trackReferralCapture } from "@/services/firebase-referrals";

export function ReferralCapture() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useFirebaseAuth();
  const capturedKey = useRef("");
  const code = normalizePromoterCode(params.get("ref") ?? "");

  useEffect(() => {
    if (!code) return;

    const key = `${code}:${user?.uid ?? "guest"}`;
    if (capturedKey.current === key) return;
    capturedKey.current = key;

    void trackReferralCapture(code, "link", user?.uid ?? null).then((result) => {
      if (!user && pathname === "/" && result.ok) router.push(`/account?next=${encodeURIComponent("/")}`);
    });
  }, [code, pathname, router, user]);

  return null;
}
