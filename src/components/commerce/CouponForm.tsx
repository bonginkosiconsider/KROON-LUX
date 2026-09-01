"use client";

import { FormEvent, useState } from "react";
import { useActiveReferral } from "@/hooks/use-active-referral";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import {
  clearStoredReferral,
  normalizePromoterCode,
  trackReferralCapture,
  validatePromoterCode,
} from "@/services/firebase-referrals";

export function CouponForm({ initialCode, label = "Promoter code" }: { initialCode?: string | null; label?: string }) {
  const { user } = useFirebaseAuth();
  const referral = useActiveReferral(user?.uid);
  const [code, setCode] = useState(() => normalizePromoterCode(initialCode ?? ""));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCode = normalizePromoterCode(code);

    if (!nextCode) {
      clearStoredReferral();
      setMessage("Promotional code cleared.");
      return;
    }

    const codeError = validatePromoterCode(nextCode);
    if (codeError) {
      setMessage(codeError);
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const result = await trackReferralCapture(nextCode, "promo_code", user?.uid ?? null);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setCode(result.referral.code);
      setMessage(user ? `${result.referral.code} applied for ${result.referral.discountPercent}% off.` : `Sign in to activate ${result.referral.discountPercent}% off from ${result.referral.code}.`);
    } catch {
      setMessage("Promotional code could not be applied.");
    } finally {
      setPending(false);
    }
  }

  const activeMessage = referral
    ? user
      ? `${referral.code} active: ${referral.discountPercent}% off.`
      : `Sign in to activate ${referral.discountPercent}% off from ${referral.code}.`
    : "Enter an approved promoter code.";

  return (
    <form className="coupon-form" onSubmit={submit}>
      <label>
        {label}
        <input
          name="couponCode"
          onChange={(event) => setCode(normalizePromoterCode(event.currentTarget.value))}
          placeholder="KROON10"
          value={code}
        />
      </label>
      <div className="coupon-actions">
        <button className="button button-outline" type="submit" disabled={pending}>
          {pending ? "Checking..." : "Apply"}
        </button>
        {referral ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              clearStoredReferral();
              setCode("");
              setMessage("Promotional code cleared.");
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="form-message">{message ?? activeMessage}</p>
    </form>
  );
}
