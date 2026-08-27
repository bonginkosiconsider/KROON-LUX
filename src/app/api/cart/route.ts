import { NextRequest } from "next/server";
import { z } from "zod";
import { clearCart, readCart, updateCartCoupon } from "@/server/cart/service";
import { apiError, ok, validationError } from "@/server/http/responses";

const cartPatchSchema = z.object({
  couponCode: z.string().trim().max(40).nullable().optional(),
});

export async function GET() {
  try {
    return ok(await readCart(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("SERVICE_UNAVAILABLE", "Cart is temporarily unavailable.", 503);
  }
}

export async function PATCH(request: NextRequest) {
  const parsed = cartPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await updateCartCoupon(parsed.data.couponCode ?? null));
  } catch {
    return apiError("SERVICE_UNAVAILABLE", "Cart could not be updated.", 503);
  }
}

export async function DELETE() {
  try {
    return ok(await clearCart());
  } catch {
    return apiError("SERVICE_UNAVAILABLE", "Cart could not be cleared.", 503);
  }
}

