import { NextRequest } from "next/server";
import { z } from "zod";
import { removeCartItem, updateCartItem } from "@/server/cart/service";
import { apiError, ok, validationError } from "@/server/http/responses";

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

type ItemRouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function PATCH(request: NextRequest, context: ItemRouteContext) {
  const parsed = updateItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { itemId } = await context.params;
    return ok(await updateCartItem(itemId, parsed.data.quantity));
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return apiError("CONFLICT", "Requested quantity is not available.", 409);
    }
    return apiError("NOT_FOUND", "Cart item was not found.", 404);
  }
}

export async function DELETE(_request: NextRequest, context: ItemRouteContext) {
  const { itemId } = await context.params;
  try {
    return ok(await removeCartItem(itemId));
  } catch {
    return apiError("NOT_FOUND", "Cart item was not found.", 404);
  }
}

