"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setMessage(body?.error?.message ?? "Account request failed.");
      return;
    }
    router.refresh();
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

