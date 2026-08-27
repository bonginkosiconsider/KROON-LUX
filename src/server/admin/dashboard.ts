import "server-only";

import { OrderStatus, PaymentStatus, ProductStatus, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";

export async function getAdminDashboard() {
  const admin = await requireAdmin();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenue, orders, customers, products, lowStock, recentOrders, promoters, commissions] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: monthStart } },
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    prisma.productVariant.count({ where: { stockStatus: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] } } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
      },
    }),
    prisma.promoter.count(),
    prisma.referralCommission.aggregate({ where: { status: "PENDING" }, _sum: { amountCents: true }, _count: true }),
  ]);

  return {
    admin,
    metrics: {
      revenueCents: revenue._sum.totalCents ?? 0,
      orders,
      customers,
      activeProducts: products,
      lowStock,
      promoters,
      pendingCommissionCents: commissions._sum.amountCents ?? 0,
      pendingCommissions: commissions._count,
    },
    recentOrders,
  };
}

export async function getAdminAnalytics() {
  await requireAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, totalCents: true, paymentStatus: true },
  });

  const byDay = new Map<string, { date: string; revenueCents: number; orders: number }>();
  for (const order of orders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const current = byDay.get(date) ?? { date, revenueCents: 0, orders: 0 };
    current.orders += 1;
    if (order.paymentStatus === PaymentStatus.PAID) current.revenueCents += order.totalCents;
    byDay.set(date, current);
  }

  return Array.from(byDay.values());
}

export async function listAdminOrders() {
  await requireAdmin();
  return prisma.order.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      customerFirstName: true,
      customerLastName: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      items: { select: { quantity: true } },
    },
  });
}

export async function listAdminReferrals() {
  await requireAdmin();
  return prisma.promoter.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      status: true,
      commissionRateBps: true,
      fixedCommissionCents: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { clicks: true, commissions: true } },
      commissions: { select: { amountCents: true, status: true } },
    },
  });
}

