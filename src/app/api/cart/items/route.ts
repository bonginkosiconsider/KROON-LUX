import { NextRequest } from "next/server";
import { z } from "zod";
import { addCartItem } from "@/server/cart/service";
import { apiError, ok, validationError } from "@/server/http/responses";

const addItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export async function POST(request: NextRequest) {
  const parsed = addItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await addCartItem(parsed.data.variantId, parsed.data.quantity), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return apiError("CONFLICT", "Requested quantity is not available.", 409);
    }
    if (error instanceof Error && error.message === "VARIANT_NOT_AVAILABLE") {
      return apiError("NOT_FOUND", "This product variation is not available.", 404);
    }
    return apiError("SERVICE_UNAVAILABLE", "Cart could not be updated.", 503);
  }
}

