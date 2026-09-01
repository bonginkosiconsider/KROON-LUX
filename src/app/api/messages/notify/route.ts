import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to, subject, text, conversationId, conversationToken } = await request.json();
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from || !to || !text) return NextResponse.json({ delivered: false, configured: false });
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const chatLink = conversationId ? `${origin}/?threadId=${encodeURIComponent(conversationId)}${conversationToken ? `&token=${encodeURIComponent(conversationToken)}` : ""}` : `${origin}/?support=1`;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN;
  const replyTo = conversationId && inboundDomain ? `reply+${conversationId}@${inboundDomain}` : undefined;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject, reply_to: replyTo, text: `${text}\n\nContinue the conversation: ${chatLink}` }) });
  if (!response.ok) return NextResponse.json({ delivered: false }, { status: 502 });
  return NextResponse.json({ delivered: true });
}
