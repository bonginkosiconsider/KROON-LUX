import { NextRequest } from "next/server";
import { loginCustomer, loginSchema } from "@/server/auth/service";
import { apiError, ok, validationError } from "@/server/http/responses";

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await loginCustomer(parsed.data));
  } catch {
    return apiError("UNAUTHORIZED", "Email or password is incorrect.", 401);
  }
}

