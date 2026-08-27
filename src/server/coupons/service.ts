import "server-only";

import { CouponType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CouponQuote = {
  code: string | null;
  discountCents: number;
  freeShipping: boolean;
  message: string | null;
};

const emptyCoupon: CouponQuote = {
  code: null,
  discountCents: 0,
  freeShipping: false,
  message: null,
};

export async function quoteCoupon(code: string | null | undefined, subtotalCents: number, shippingCents = 0): Promise<CouponQuote> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return emptyCoupon;

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  const now = new Date();
  if (!coupon || !coupon.active) return { ...emptyCoupon, code: normalized, message: "Coupon is not active." };
  if (coupon.startsAt && coupon.startsAt > now) return { ...emptyCoupon, code: normalized, message: "Coupon is not active yet." };
  if (coupon.expiresAt && coupon.expiresAt <= now) return { ...emptyCoupon, code: normalized, message: "Coupon has expired." };
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return { ...emptyCoupon, code: normalized, message: "Coupon usage limit reached." };
  if (coupon.minimumSpendCents !== null && subtotalCents < coupon.minimumSpendCents) {
    return { ...emptyCoupon, code: normalized, message: "Cart does not meet the minimum spend for this coupon." };
  }

  if (coupon.type === CouponType.FREE_SHIPPING) {
    return { code: normalized, discountCents: Math.min(shippingCents, shippingCents), freeShipping: true, message: null };
  }

  if (coupon.type === CouponType.PERCENTAGE) {
    const percent = Math.max(0, Math.min(coupon.amount, 100));
    return { code: normalized, discountCents: Math.floor((subtotalCents * percent) / 100), freeShipping: false, message: null };
  }

  return { code: normalized, discountCents: Math.min(coupon.amount, subtotalCents), freeShipping: false, message: null };
}

