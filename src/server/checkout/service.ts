import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { readCart } from "@/server/cart/service";
import { getActiveReferralAttribution, calculateCommissionCents } from "@/server/referrals/service";

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().min(4).max(200),
  apartment: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(2).max(30),
  country: z.string().trim().min(2).max(80).default("South Africa"),
});

function orderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `KL-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createPendingCheckout(input: z.infer<typeof checkoutSchema>) {
  const user = await getCurrentUser();
  const cart = await readCart();
  if (cart.items.length === 0) throw new Error("CART_EMPTY");

  for (const item of cart.items) {
    if (item.quantity > item.availableQuantity) throw new Error("INSUFFICIENT_STOCK");
  }

  const referral = await getActiveReferralAttribution(user?.id);
  const shippingAddress = {
    line1: input.address,
    line2: input.apartment || null,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
    country: input.country,
  };

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        userId: user?.id,
        customerEmail: input.email.toLowerCase(),
        customerFirstName: input.firstName,
        customerLastName: input.lastName,
        customerPhone: input.phone,
        shippingAddress,
        subtotalCents: cart.subtotalCents,
        discountCents: cart.discountCents,
        shippingCents: cart.shippingCents,
        taxCents: cart.taxCents,
        totalCents: cart.totalCents,
        couponCode: cart.coupon.code,
        referralCode: referral?.referralCode,
        referralAttributionId: referral?.id,
        items: {
          create: cart.items.map((item) => ({
            product: { connect: { id: item.product.id } },
            variant: { connect: { id: item.variant.id } },
            productName: item.product.name,
            variantName: item.variant.name,
            sku: item.variant.sku,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            imageUrl: item.variant.imageUrl ?? item.product.images[0]?.url,
            attributes: item.variant.attributes as Prisma.InputJsonValue,
          })),
        },
      },
      select: { id: true, orderNumber: true, totalCents: true, currency: true },
    });

    if (cart.coupon.code && cart.discountCents > 0) {
      const coupon = await tx.coupon.update({
        where: { code: cart.coupon.code },
        data: { usageCount: { increment: 1 } },
        select: { id: true },
      });
      await tx.couponRedemption.create({ data: { couponId: coupon.id, orderId: order.id, userId: user?.id } });
    }

    if (referral) {
      const amountCents = calculateCommissionCents(cart.subtotalCents, referral.promoter.commissionRateBps, referral.promoter.fixedCommissionCents);
      if (amountCents > 0) {
        await tx.referralCommission.create({
          data: { promoterId: referral.promoterId, orderId: order.id, amountCents },
        });
      }
      await tx.referralAttribution.update({
        where: { id: referral.id },
        data: { status: "CONVERTED", userId: user?.id, orderId: order.id, convertedAt: new Date() },
      });
    }

    await tx.outboxEvent.create({
      data: {
        type: "ORDER_PENDING_PAYMENT",
        payload: { orderId: order.id, orderNumber: order.orderNumber, email: input.email.toLowerCase() },
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return {
      order,
      payment: {
        provider: "manual",
        status: "pending",
        message: "Payment provider integration is isolated server-side and ready to connect.",
      },
    };
  });
}

