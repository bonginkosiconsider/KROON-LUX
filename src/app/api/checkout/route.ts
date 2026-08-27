import { NextRequest } from "next/server";
import { createPendingCheckout, checkoutSchema } from "@/server/checkout/service";
import { apiError, ok, validationError } from "@/server/http/responses";

export async function POST(request: NextRequest) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await createPendingCheckout(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CART_EMPTY") return apiError("BAD_REQUEST", "Your cart is empty.", 400);
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return apiError("CONFLICT", "One or more cart items are no longer available.", 409);
    return apiError("SERVICE_UNAVAILABLE", "Checkout is temporarily unavailable.", 503);
  }
}

