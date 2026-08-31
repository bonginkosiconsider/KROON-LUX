import { NextRequest, NextResponse } from "next/server";

type ReferralRouteContext = {
  params: Promise<{ code: string }>;
};

function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

export async function GET(request: NextRequest, context: ReferralRouteContext) {
  const { code } = await context.params;
  const url = new URL("/shop", request.url);
  const normalized = normalizeReferralCode(code);
  if (normalized) url.searchParams.set("ref", normalized);
  return NextResponse.redirect(url);
}
