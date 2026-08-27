import { NextRequest } from "next/server";
import { registerCustomer, registerSchema } from "@/server/auth/service";
import { apiError, ok, validationError } from "@/server/http/responses";

export async function POST(request: NextRequest) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await registerCustomer(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return apiError("CONFLICT", "An account with that email already exists.", 409);
    }
    return apiError("SERVICE_UNAVAILABLE", "Registration is temporarily unavailable.", 503);
  }
}

