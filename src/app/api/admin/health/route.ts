import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";

export async function GET() {
  try {
    const admin = await requireAdmin();
    return NextResponse.json({ data: { authorized: true, adminId: admin.id } });
  } catch {
    return NextResponse.json({ error: { code: "ADMIN_UNAUTHORIZED", message: "Administrator authorization is required." } }, { status: 401 });
  }
}
