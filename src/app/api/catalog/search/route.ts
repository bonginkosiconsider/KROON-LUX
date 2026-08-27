import { NextRequest } from "next/server";
import { z } from "zod";
import { searchProductSuggestions } from "@/server/catalog/products";
import { ok, validationError, apiError } from "@/server/http/responses";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return ok(await searchProductSuggestions(parsed.data.q), {
      headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" },
    });
  } catch {
    return apiError("SERVICE_UNAVAILABLE", "Search is temporarily unavailable.", 503);
  }
}

