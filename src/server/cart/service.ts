import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { quoteCoupon } from "@/server/coupons/service";
import { shippingCostCents } from "@/lib/shipping";

const cartCookie = "kroon_cart";
const cartCookieMaxAge = 60 * 60 * 24 * 90;

const cartSelect = {
  id: true,
  couponCode: true,
  referralCode: true,
  currency: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      variant: {
        select: {
          id: true,
          sku: true,
          name: true,
          priceInCents: true,
          salePriceCents: true,
          stockQuantity: true,
          reservedStock: true,
          stockStatus: true,
          imageUrl: true,
          size: true,
          color: true,
          attributes: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, altText: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

async function getCartIdentity() {
  const user = await getCurrentUser();
  if (user) return { userId: user.id, guestKey: null };

  const cookieStore = await cookies();
  const existing = cookieStore.get(cartCookie)?.value;
  if (existing) return { userId: null, guestKey: existing };

  const guestKey = randomBytes(24).toString("hex");
  cookieStore.set(cartCookie, guestKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cartCookieMaxAge,
  });
  return { userId: null, guestKey };
}

async function getOrCreateCart() {
  const identity = await getCartIdentity();
  if (identity.userId) {
    return prisma.cart.upsert({
      where: { userId: identity.userId },
      create: { userId: identity.userId },
      update: {},
      select: cartSelect,
    });
  }

  if (!identity.guestKey) throw new Error("CART_IDENTITY_MISSING");
  return prisma.cart.upsert({
    where: { guestKey: identity.guestKey },
    create: { guestKey: identity.guestKey },
    update: {},
    select: cartSelect,
  });
}

export type CartSnapshot = Awaited<ReturnType<typeof readCart>>;

function itemUnitPrice(item: Awaited<ReturnType<typeof getOrCreateCart>>["items"][number]) {
  return item.variant.salePriceCents ?? item.variant.priceInCents;
}

export async function readCart() {
  const cart = await getOrCreateCart();
  const items = cart.items.map((item) => {
    const unitPriceCents = itemUnitPrice(item);
    const availableQuantity = Math.max(0, item.variant.stockQuantity - item.variant.reservedStock);
    return {
      id: item.id,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.quantity,
      availableQuantity,
      variant: item.variant,
      product: item.variant.product,
    };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents = shippingCostCents(subtotalCents);
  const coupon = await quoteCoupon(cart.couponCode, subtotalCents, shippingCents);
  const discountCents = Math.min(coupon.discountCents, subtotalCents + shippingCents);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  return {
    id: cart.id,
    currency: cart.currency,
    coupon,
    referralCode: cart.referralCode,
    items,
    subtotalCents,
    shippingCents,
    discountCents,
    taxCents: 0,
    totalCents,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function addCartItem(variantId: string, quantity: number) {
  const cart = await getOrCreateCart();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stockQuantity: true, reservedStock: true, product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== "ACTIVE") throw new Error("VARIANT_NOT_AVAILABLE");

  const available = Math.max(0, variant.stockQuantity - variant.reservedStock);
  if (quantity < 1 || quantity > available) throw new Error("INSUFFICIENT_STOCK");

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity: { increment: quantity } },
  });

  const updated = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    select: { id: true, quantity: true },
  });
  if (updated && updated.quantity > available) {
    await prisma.cartItem.update({ where: { id: updated.id }, data: { quantity: available } });
  }

  return readCart();
}

export async function updateCartItem(itemId: string, quantity: number) {
  const cart = await getOrCreateCart();
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: { id: true, variant: { select: { stockQuantity: true, reservedStock: true } } },
  });
  if (!item) throw new Error("CART_ITEM_NOT_FOUND");
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return readCart();
  }

  const available = Math.max(0, item.variant.stockQuantity - item.variant.reservedStock);
  if (quantity > available) throw new Error("INSUFFICIENT_STOCK");
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return readCart();
}

export async function removeCartItem(itemId: string) {
  const cart = await getOrCreateCart();
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return readCart();
}

export async function updateCartCoupon(couponCode: string | null) {
  const cart = await getOrCreateCart();
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: couponCode?.trim().toUpperCase() || null } });
  return readCart();
}

export async function clearCart() {
  const cart = await getOrCreateCart();
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return readCart();
}

