import "server-only";

import { cache } from "react";
import { Prisma, ProductStatus, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const productListInput = {
  limit: 24,
  maxLimit: 48,
} as const;

export type ProductListQuery = {
  cursor?: string;
  limit?: number;
  search?: string;
  category?: string;
  collection?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  availability?: "in-stock" | "low-stock" | "out-of-stock";
  rating?: number;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "best-selling" | "highest-rated";
};

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  brand: true,
  featured: true,
  newArrival: true,
  bestSeller: true,
  onSale: true,
  startingPriceCents: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, altText: true, width: true, height: true } },
  variants: {
    orderBy: { priceInCents: "asc" },
    take: 1,
    select: { id: true, priceInCents: true, salePriceCents: true, stockStatus: true, stockQuantity: true, reservedStock: true },
  },
  category: { select: { name: true, slug: true } },
  collection: { select: { name: true, slug: true } },
  reviews: { where: { approved: true, hidden: false }, select: { rating: true } },
} satisfies Prisma.ProductSelect;

function searchWhere(search?: string): Prisma.ProductWhereInput {
  const value = search?.trim();
  if (!value) return {};
  return {
    OR: [
      { name: { contains: value, mode: "insensitive" } },
      { brand: { contains: value, mode: "insensitive" } },
      { description: { contains: value, mode: "insensitive" } },
      { shortDescription: { contains: value, mode: "insensitive" } },
      { tags: { some: { tag: { contains: value, mode: "insensitive" } } } },
      { variants: { some: { sku: { contains: value, mode: "insensitive" } } } },
      { category: { name: { contains: value, mode: "insensitive" } } },
    ],
  };
}

function stockStatusForFilter(filter?: ProductListQuery["availability"]) {
  if (filter === "in-stock") return StockStatus.IN_STOCK;
  if (filter === "low-stock") return StockStatus.LOW_STOCK;
  if (filter === "out-of-stock") return StockStatus.OUT_OF_STOCK;
  return undefined;
}

function buildProductWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  const stockStatus = stockStatusForFilter(query.availability);
  return {
    status: ProductStatus.ACTIVE,
    ...searchWhere(query.search),
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.collection ? { collection: { slug: query.collection } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          startingPriceCents: {
            ...(query.minPrice !== undefined ? { gte: Math.round(query.minPrice * 100) } : {}),
            ...(query.maxPrice !== undefined ? { lte: Math.round(query.maxPrice * 100) } : {}),
          },
        }
      : {}),
    ...(query.size || query.color || stockStatus
      ? {
          variants: {
            some: {
              ...(query.size ? { size: { equals: query.size, mode: "insensitive" } } : {}),
              ...(query.color ? { color: { equals: query.color, mode: "insensitive" } } : {}),
              ...(stockStatus ? { stockStatus } : {}),
            },
          },
        }
      : {}),
  };
}

function orderProducts(sort: ProductListQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "price-asc") return [{ startingPriceCents: "asc" }, { id: "asc" }];
  if (sort === "price-desc") return [{ startingPriceCents: "desc" }, { id: "desc" }];
  if (sort === "newest") return [{ createdAt: "desc" }, { id: "desc" }];
  if (sort === "best-selling") return [{ bestSeller: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  if (sort === "highest-rated") return [{ bestSeller: "desc" }, { featured: "desc" }, { id: "asc" }];
  return [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }];
}

export async function listActiveProducts(query: ProductListQuery = {}) {
  const limit = Math.min(Math.max(query.limit ?? productListInput.limit, 1), productListInput.maxLimit);
  const products = await prisma.product.findMany({
    where: buildProductWhere(query),
    take: limit + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    orderBy: orderProducts(query.sort),
    select: productCardSelect,
  });

  const hasMore = products.length > limit;
  const data = products.slice(0, limit).map((product) => ({
    ...product,
    averageRating:
      product.reviews.length === 0
        ? null
        : product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length,
  }));
  return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
}

export const getActiveProductBySlug = cache(async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      brand: true,
      videoUrl: true,
      shippingInfo: true,
      seoTitle: true,
      seoDescription: true,
      startingPriceCents: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, altText: true, width: true, height: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }, { priceInCents: "asc" }],
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          priceInCents: true,
          salePriceCents: true,
          stockQuantity: true,
          reservedStock: true,
          stockStatus: true,
          attributes: true,
          size: true,
          color: true,
          imageUrl: true,
        },
      },
      tags: { select: { tag: true } },
      attributes: { select: { name: true, value: true } },
      category: { select: { name: true, slug: true } },
      collection: { select: { name: true, slug: true } },
      reviews: {
        where: { approved: true, hidden: false },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          verified: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
});

export async function getCatalogFacets() {
  const [categories, collections, variants] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    prisma.collection.findMany({
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, featured: true },
    }),
    prisma.productVariant.findMany({
      where: { product: { status: ProductStatus.ACTIVE } },
      distinct: ["size", "color"],
      select: { size: true, color: true },
      take: 250,
    }),
  ]);

  return {
    categories,
    collections,
    sizes: Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean))).sort(),
    colors: Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))).sort(),
  };
}

export async function searchProductSuggestions(search: string) {
  const query = search.trim();
  if (query.length < 2) return [];
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE, ...searchWhere(query) },
    take: 8,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      variants: { take: 1, select: { sku: true } },
      category: { select: { name: true } },
    },
  });
  return products.map((product) => ({
    id: product.id,
    label: product.name,
    slug: product.slug,
    brand: product.brand,
    sku: product.variants[0]?.sku ?? null,
    category: product.category?.name ?? null,
  }));
}
