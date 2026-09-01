"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function NewsletterSignup() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setMessage(""); try { await addDoc(collection(db, "newsletterSubscribers"), { email: email.trim().toLowerCase(), createdAt: serverTimestamp(), source: "footer" }); setEmail(""); setMessage("You’re on the list."); } catch { setMessage("We couldn’t add you right now. Please try again."); } finally { setSaving(false); } }
  return <form className="footer-newsletter-form" onSubmit={submit}><label htmlFor="footer-email">Your email address</label><div className="footer-email-row"><input aria-describedby="footer-newsletter-note" id="footer-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /><button disabled={saving} type="submit">{saving ? "Joining…" : "Join"}</button></div><p id="footer-newsletter-note">By joining, you agree to receive considered correspondence from Kroon Luxe.</p>{message ? <p aria-live="polite" className="footer-newsletter-message">{message}</p> : null}</form>;
}
