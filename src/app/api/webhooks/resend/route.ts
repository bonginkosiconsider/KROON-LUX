import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { serverDb } from "@/lib/firebase-server";

function verify(payload: string, request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature")?.split(" ") ?? [];
  if (!secret || !id || !timestamp || !signatures.length) return !secret && process.env.NODE_ENV !== "production";
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64");
  return signatures.some((value) => {
    const candidate = value.replace(/^v1,/, "");
    const a = Buffer.from(candidate); const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  if (!verify(payload, request)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  let event: { type?: string; data?: { email_id?: string; to?: string[]; from?: string; subject?: string; message_id?: string } };
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (event.type !== "email.received" || !event.data?.email_id) return NextResponse.json({ ignored: true });

  const data = event.data;
  const emailId = data.email_id;
  if (!emailId) return NextResponse.json({ ignored: true });
  const recipient = data.to?.find((address) => /reply\+[^@]+@/i.test(address));
  const threadId = recipient?.match(/^reply\+([^@]+)@/i)?.[1];
  if (!threadId) return NextResponse.json({ ignored: true, reason: "No thread address" });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 503 });
  const received = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!received.ok) return NextResponse.json({ error: "Unable to retrieve received email" }, { status: 502 });
  const email = await received.json() as { text?: string; html?: string };
  const text = (email.text ?? email.html ?? "").trim();
  if (!text) return NextResponse.json({ ignored: true, reason: "Empty message" });
  const messageId = createHash("sha256").update(data.message_id ?? emailId).digest("hex").slice(0, 40);
  const conversation = doc(serverDb, "conversations", threadId);
  await setDoc(conversation, { lastMessage: text, lastUpdated: serverTimestamp(), lastCustomerMessageAt: serverTimestamp(), unreadByAdmin: true, status: "open", ...(data.from ? { customerEmail: data.from } : {}) }, { merge: true });
  await setDoc(doc(collection(conversation, "messages"), messageId), { sender: "customer", text, timestamp: serverTimestamp(), sentVia: "email", externalMessageId: data.message_id ?? emailId }, { merge: true });
  return NextResponse.json({ received: true, threadId });
}
