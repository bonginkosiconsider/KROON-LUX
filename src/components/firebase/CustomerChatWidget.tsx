"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { createConversationToken, sendConversationMessage } from "@/services/firebase-messages";

export function CustomerChatWidget() {
  const pathname = usePathname();
  const initialParams = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const [open, setOpen] = useState(() => Boolean(initialParams?.has("support") || initialParams?.has("threadId"))); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ id?: string; token?: string }>(() => ({ id: initialParams?.get("threadId") ?? undefined, token: initialParams?.get("token") ?? undefined }));
  if (pathname === "/checkout") return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget); const name = String(data.get("name")); const email = String(data.get("email")); const text = String(data.get("message")); const accessToken = thread.token ?? createConversationToken(); try { const id = await sendConversationMessage({ name, email, text, sender: "customer", sentVia: "widget", conversationId: thread.id, accessToken }); setThread({ id, token: accessToken }); await fetch("/api/messages/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: process.env.NEXT_PUBLIC_ADMIN_EMAIL, subject: `New Kroon Luxe inquiry from ${name}`, text, conversationId: id, conversationToken: accessToken }) }); setSent(true); event.currentTarget.reset(); } finally { setBusy(false); } }
  return <div className={`customer-chat${open ? " is-open" : ""}`}><button className="customer-chat-trigger" onClick={() => setOpen(!open)} type="button">{open ? "Close" : "Talk to us"}</button>{open ? <section className="customer-chat-panel"><p className="eyebrow">Kroon Luxe support</p><h2>How can we help?</h2>{sent ? <p className="chat-success">Thank you — we’ll be in touch shortly.</p> : <form onSubmit={submit}><input name="name" placeholder="Your name" required /><input name="email" type="email" placeholder="Email address" required /><textarea name="message" placeholder="Your message" rows={4} required /><button className="button button-dark" disabled={busy}>{busy ? "Sending..." : "Send message"}</button></form>}</section> : null}</div>;
}
