import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listActiveProducts } from "@/server/catalog/products";

const querySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
  search: z.string().trim().max(120).optional(),
  category: z.string().regex(/^[a-z0-9-]+$/).optional(),
  collection: z.string().regex(/^[a-z0-9-]+$/).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  size: z.string().trim().max(40).optional(),
  color: z.string().trim().max(60).optional(),
  availability: z.enum(["in-stock", "low-stock", "out-of-stock"]).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "best-selling", "highest-rated"]).optional(),
}).refine((input) => input.minPrice === undefined || input.maxPrice === undefined || input.minPrice <= input.maxPrice, {
  message: "minPrice must not exceed maxPrice",
  path: ["minPrice"],
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_QUERY", message: "One or more filters are invalid.", fieldErrors: parsed.error.flatten().fieldErrors } }, { status: 400 });
  }

  try {
    const result = await listActiveProducts(parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: { code: "CATALOG_UNAVAILABLE", message: "The catalog is temporarily unavailable." } }, { status: 503 });
  }
}
