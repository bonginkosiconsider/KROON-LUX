import { NextRequest } from "next/server";
import { archiveAdminProduct, adminProductUpdateSchema, updateAdminProduct } from "@/server/admin/catalog";
import { apiError, ok, validationError } from "@/server/http/responses";

type AdminProductContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: AdminProductContext) {
  const parsed = adminProductUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id } = await context.params;
    return ok(await updateAdminProduct(id, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Administrator authorization is required.", 401);
    }
    return apiError("BAD_REQUEST", "Product could not be updated.", 400);
  }
}

export async function DELETE(_request: NextRequest, context: AdminProductContext) {
  try {
    const { id } = await context.params;
    return ok(await archiveAdminProduct(id));
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_UNAUTHORIZED") {
      return apiError("UNAUTHORIZED", "Administrator authorization is required.", 401);
    }
    return apiError("BAD_REQUEST", "Product could not be archived.", 400);
  }
}

