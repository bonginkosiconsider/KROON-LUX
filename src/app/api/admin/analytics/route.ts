import { getAdminAnalytics } from "@/server/admin/dashboard";
import { apiError, ok } from "@/server/http/responses";

export async function GET() {
  try {
    return ok(await getAdminAnalytics(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("UNAUTHORIZED", "Administrator authorization is required.", 401);
  }
}

