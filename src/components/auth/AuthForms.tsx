"use client";

import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { ensureCustomerProfile } from "@/hooks/use-firebase-auth";

type Mode = "login" | "register";

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) return "Account request failed.";

  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled in Firebase Authentication.";
    case "auth/weak-password":
      return "Password must be at least 10 characters.";
    default:
      return "Account request failed.";
  }
}

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = formText(formData, "email").toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      if (mode === "register") {
        const firstName = formText(formData, "firstName");
        const lastName = formText(formData, "lastName");
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: `${firstName} ${lastName}`.trim() });
        await ensureCustomerProfile(credential.user, { firstName, lastName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.refresh();
    } catch (error) {
      setMessage(authMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="segmented-control" role="tablist" aria-label="Account access">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          Sign in
        </button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
          Create account
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "register" ? (
          <div className="form-grid">
            <label>
              First name
              <input name="firstName" required />
            </label>
            <label>
              Last name
              <input name="lastName" required />
            </label>
          </div>
        ) : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 10 : 1} />
        </label>
        <button className="button button-dark" type="submit" disabled={pending}>
          {pending ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </section>
  );
}
