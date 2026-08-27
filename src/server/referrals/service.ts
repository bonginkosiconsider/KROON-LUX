import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PromoterStatus, ReferralAttributionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const referralCookie = "kroon_ref";
const visitorCookie = "kroon_visitor";

function referralSecret() {
  return process.env.REFERRAL_SECRET || process.env.SESSION_SECRET || "development-only-referral-secret";
}

function sign(value: string) {
  return createHmac("sha256", referralSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function encodeReferral(value: { attributionId: string; code: string; expiresAt: string }) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeReferral(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      attributionId: string;
      code: string;
      expiresAt: string;
    };
  } catch {
    return null;
  }
}

async function getOrCreateVisitorKey() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(visitorCookie)?.value;
  if (existing) return existing;

  const visitorKey = randomBytes(24).toString("hex");
  cookieStore.set(visitorCookie, visitorKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return visitorKey;
}

export async function trackReferralVisit(code: string) {
  const normalized = code.trim().toUpperCase();
  const promoter = await prisma.promoter.findUnique({
    where: { code: normalized },
    select: { id: true, code: true, status: true, attributionDays: true },
  });
  if (!promoter || promoter.status !== PromoterStatus.APPROVED) return { tracked: false };

  const visitorKey = await getOrCreateVisitorKey();
  const expiresAt = new Date(Date.now() + promoter.attributionDays * 24 * 60 * 60 * 1000);
  const attribution = await prisma.referralAttribution.create({
    data: {
      promoterId: promoter.id,
      visitorKey,
      referralCode: promoter.code,
      expiresAt,
    },
    select: { id: true },
  });

  await prisma.referralClick.create({ data: { promoterId: promoter.id, visitorKey } });

  const cookieStore = await cookies();
  cookieStore.set(referralCookie, encodeReferral({ attributionId: attribution.id, code: promoter.code, expiresAt: expiresAt.toISOString() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: promoter.attributionDays * 24 * 60 * 60,
  });

  return { tracked: true, code: promoter.code };
}

export async function getActiveReferralAttribution(userId?: string | null) {
  const decoded = decodeReferral((await cookies()).get(referralCookie)?.value);
  if (!decoded || new Date(decoded.expiresAt) <= new Date()) return null;

  const attribution = await prisma.referralAttribution.findFirst({
    where: {
      id: decoded.attributionId,
      status: ReferralAttributionStatus.ACTIVE,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, referralCode: true, promoterId: true, promoter: { select: { userId: true, commissionRateBps: true, fixedCommissionCents: true } } },
  });

  if (!attribution) return null;
  if (userId && attribution.promoter.userId === userId) return null;
  return attribution;
}

export function calculateCommissionCents(orderSubtotalCents: number, rateBps: number, fixedCommissionCents?: number | null) {
  if (fixedCommissionCents !== null && fixedCommissionCents !== undefined) return Math.max(0, fixedCommissionCents);
  return Math.floor((orderSubtotalCents * rateBps) / 10000);
}

