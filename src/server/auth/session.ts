import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const sessionCookie = "kroon_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + sessionLifetimeMs) },
  });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeMs / 1000,
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await prisma.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    select: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, emailVerifiedAt: true } } },
  });
  return session?.user ?? null;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(sessionCookie);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("ADMIN_UNAUTHORIZED");

  const allowedEmails = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2].filter(Boolean).map((email) => email!.toLowerCase());
  const isAllowlisted = allowedEmails.length === 2 && allowedEmails.includes(user.email.toLowerCase());
  const grant = await prisma.adminGrant.findFirst({ where: { userId: user.id, enabled: true, role: "ADMIN" } });
  if (!isAllowlisted || !grant) throw new Error("ADMIN_UNAUTHORIZED");
  return user;
}
