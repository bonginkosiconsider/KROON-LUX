import { NextRequest } from "next/server";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { adminProductSchema, createAdminProduct, listAdminProducts } from "@/server/admin/catalog";
import { apiError, ok, validationError } from "@/server/http/responses";

const listProductsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = listProductsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await listAdminProducts(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("UNAUTHORIZED", "Administrator authorization is required.", 401);
  }
}

export async function POST(request: NextRequest) {
  const parsed = adminProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await createAdminProduct(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Administrator authorization is required.", 401);
    }
    return apiError("BAD_REQUEST", "Product could not be created.", 400);
  }
}

