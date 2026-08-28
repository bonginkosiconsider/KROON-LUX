"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FormEvent, useState } from "react";
import { auth } from "@/lib/firebase";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useFirebaseAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, String(form.get("email")), String(form.get("password")));
    } catch { setError("Unable to sign in. Check the email and password configured in Firebase Authentication."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="admin-auth-state">Checking secure admin access…</div>;
  if (user && profile === null) return <div className="admin-auth-state"><h1>Access pending</h1><p>Your Firebase account has not been assigned a user role. An administrator must set <code>users/{user.uid}.role</code> to <code>admin</code>.</p><button className="button button-light" onClick={() => signOut(auth)}>Sign out</button></div>;
  if (user && !isAdmin) return <div className="admin-auth-state"><h1>Admin access required</h1><p>{user.email} is a customer account and cannot access operations.</p><button className="button button-light" onClick={() => signOut(auth)}>Sign out</button></div>;
  if (isAdmin) return <>{children}</>;

  return <section className="admin-login"><p className="eyebrow gold">Secure operations</p><h1>Admin sign in</h1><p>Use an email/password account enabled in Firebase Authentication.</p><form onSubmit={login}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error ? <p className="form-message">{error}</p> : null}<button className="button button-light" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button></form></section>;
}
