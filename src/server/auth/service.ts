import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createSession, destroyCurrentSession } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/admin/audit";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  password: z.string().min(10).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(200),
});

export async function registerCustomer(input: z.infer<typeof registerSchema>) {
  const email = input.email.toLowerCase();
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    await createSession(user.id);
    await writeAuditLog({ actorId: user.id, action: "CUSTOMER_REGISTERED", entity: "User", entityId: user.id });
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("EMAIL_ALREADY_REGISTERED");
    }
    throw error;
  }
}

export async function loginCustomer(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, passwordHash: true },
  });

  const valid = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !valid || user.status !== "ACTIVE") {
    await writeAuditLog({ action: "LOGIN_FAILED", entity: "User", metadata: { email: input.email.toLowerCase() } });
    throw new Error("INVALID_CREDENTIALS");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await writeAuditLog({ actorId: user.id, action: "LOGIN_SUCCEEDED", entity: "User", entityId: user.id });
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
}

export async function logoutCustomer() {
  await destroyCurrentSession();
}

