import { logoutCustomer } from "@/server/auth/service";
import { ok } from "@/server/http/responses";

export async function POST() {
  await logoutCustomer();
  return ok({ signedOut: true });
}

