import "server-only";

import { Prisma, ProductStatus, StockStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/session";
import { writeAdminAudit } from "@/server/admin/audit";

export const adminProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).optional(),
  shortDescription: z.string().trim().max(240).optional(),
  description: z.string().trim().max(8000).optional(),
  brand: z.string().trim().max(120).optional(),
  categoryId: z.string().cuid().optional(),
  collectionId: z.string().cuid().optional(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  onSale: z.boolean().default(false),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  attributes: z.array(z.object({ name: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(120) })).max(80).default([]),
  images: z.array(z.object({ url: z.string().url(), altText: z.string().trim().min(1).max(180), sortOrder: z.number().int().min(0).default(0) })).max(20).default([]),
  variants: z.array(
    z.object({
      sku: z.string().trim().min(2).max(80),
      barcode: z.string().trim().max(80).optional(),
      name: z.string().trim().min(1).max(140),
      priceInCents: z.number().int().min(0),
      salePriceCents: z.number().int().min(0).optional(),
      costPriceCents: z.number().int().min(0).optional(),
      stockQuantity: z.number().int().min(0).default(0),
      reservedStock: z.number().int().min(0).default(0),
      lowStockAt: z.number().int().min(0).default(5),
      size: z.string().trim().max(40).optional(),
      color: z.string().trim().max(60).optional(),
      imageUrl: z.string().url().optional(),
      attributes: z.record(z.string(), z.string()).default({}),
    }),
  ).min(1).max(100),
});

const adminProductListSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  featured: true,
  newArrival: true,
  bestSeller: true,
  onSale: true,
  startingPriceCents: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  collection: { select: { name: true } },
  variants: {
    select: { id: true, sku: true, stockQuantity: true, reservedStock: true, stockStatus: true, priceInCents: true, salePriceCents: true },
    orderBy: { sku: "asc" },
  },
  images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
} satisfies Prisma.ProductSelect;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function stockStatus(stockQuantity: number, reservedStock: number, lowStockAt: number) {
  const available = stockQuantity - reservedStock;
  if (available <= 0) return StockStatus.OUT_OF_STOCK;
  if (available <= lowStockAt) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

function startingPrice(variants: z.infer<typeof adminProductSchema>["variants"]) {
  return variants.reduce<number | null>((lowest, variant) => {
    const price = variant.salePriceCents ?? variant.priceInCents;
    return lowest === null ? price : Math.min(lowest, price);
  }, null);
}

export async function listAdminProducts(query: { search?: string; status?: ProductStatus; limit?: number } = {}) {
  await requireAdmin();
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  return prisma.product.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { variants: { some: { sku: { contains: query.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: adminProductListSelect,
  });
}

export async function createAdminProduct(input: z.infer<typeof adminProductSchema>) {
  const admin = await requireAdmin();
  const slug = input.slug || slugify(input.name);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      brand: input.brand,
      categoryId: input.categoryId,
      collectionId: input.collectionId,
      status: input.status,
      featured: input.featured,
      newArrival: input.newArrival,
      bestSeller: input.bestSeller,
      onSale: input.onSale,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      startingPriceCents: startingPrice(input.variants),
      publishedAt: input.status === ProductStatus.ACTIVE ? new Date() : null,
      tags: { create: input.tags.map((tag) => ({ tag })) },
      attributes: { create: input.attributes },
      images: { create: input.images.map((image, index) => ({ ...image, primary: index === 0 })) },
      variants: {
        create: input.variants.map((variant) => ({
          sku: variant.sku,
          barcode: variant.barcode,
          name: variant.name,
          priceInCents: variant.priceInCents,
          salePriceCents: variant.salePriceCents,
          costPriceCents: variant.costPriceCents,
          stockQuantity: variant.stockQuantity,
          reservedStock: variant.reservedStock,
          lowStockAt: variant.lowStockAt,
          stockStatus: stockStatus(variant.stockQuantity, variant.reservedStock, variant.lowStockAt),
          size: variant.size,
          color: variant.color,
          imageUrl: variant.imageUrl,
          attributes: variant.attributes,
        })),
      },
    },
    select: adminProductListSelect,
  });
  await writeAdminAudit(admin.id, "PRODUCT_CREATED", "Product", product.id, { slug: product.slug });
  return product;
}

export const adminProductUpdateSchema = adminProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
  variants: z.undefined().optional(),
  images: z.undefined().optional(),
  attributes: z.undefined().optional(),
  tags: z.undefined().optional(),
});

export async function updateAdminProduct(productId: string, input: z.infer<typeof adminProductUpdateSchema>) {
  const admin = await requireAdmin();
  const data: Prisma.ProductUpdateInput = {
    ...(input.name ? { name: input.name } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.brand !== undefined ? { brand: input.brand } : {}),
    ...(input.status ? { status: input.status, publishedAt: input.status === ProductStatus.ACTIVE ? new Date() : undefined } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.newArrival !== undefined ? { newArrival: input.newArrival } : {}),
    ...(input.bestSeller !== undefined ? { bestSeller: input.bestSeller } : {}),
    ...(input.onSale !== undefined ? { onSale: input.onSale } : {}),
    ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
    ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
  };
  const product = await prisma.product.update({ where: { id: productId }, data, select: adminProductListSelect });
  await writeAdminAudit(admin.id, "PRODUCT_UPDATED", "Product", product.id, { fields: Object.keys(input) });
  return product;
}

export async function archiveAdminProduct(productId: string) {
  const admin = await requireAdmin();
  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.ARCHIVED },
    select: { id: true, slug: true },
  });
  await writeAdminAudit(admin.id, "PRODUCT_ARCHIVED", "Product", product.id, { slug: product.slug });
  return product;
}

