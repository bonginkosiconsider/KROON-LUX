import { NextRequest, NextResponse } from "next/server";
import { trackReferralVisit } from "@/server/referrals/service";

type ReferralRouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, context: ReferralRouteContext) {
  const { code } = await context.params;
  await trackReferralVisit(code);
  return NextResponse.redirect(new URL("/shop", request.url));
}

