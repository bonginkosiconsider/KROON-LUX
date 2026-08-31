"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthForms } from "@/components/auth/AuthForms";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import {
  applyForPromoter,
  buildReferralLink,
  isPromoterCodeAvailable,
  normalizePromoterCode,
  subscribePromoterApplications,
  validatePromoterCode,
  type Promoter,
} from "@/services/firebase-referrals";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

const availabilityText: Record<Availability, string> = {
  idle: "Choose a code using letters and numbers.",
  checking: "Checking availability...",
  available: "Code is available.",
  taken: "Code is already taken.",
  invalid: "Use 4 to 24 letters or numbers.",
};

function statusText(status: Promoter["status"]) {
  if (status === "approved") return "Approved";
  if (status === "paused") return "Paused";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}

export function PromoterApplicationClient() {
  const { user, profile, loading } = useFirebaseAuth();
  const [applications, setApplications] = useState<Promoter[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const normalizedCode = useMemo(() => normalizePromoterCode(codeInput), [codeInput]);
  const approvedApplication = applications.find((application) => application.status === "approved");

  useEffect(() => {
    if (!user) return;
    return subscribePromoterApplications(user.uid, setApplications);
  }, [user]);

  useEffect(() => {
    if (availability !== "checking") return;

    const timer = window.setTimeout(() => {
      isPromoterCodeAvailable(normalizedCode)
        .then((available) => setAvailability(available ? "available" : "taken"))
        .catch(() => setAvailability("taken"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [availability, normalizedCode]);

  function updateCode(value: string) {
    const nextCode = normalizePromoterCode(value);
    setCodeInput(nextCode);

    if (!nextCode) {
      setAvailability("idle");
      return;
    }

    setAvailability(validatePromoterCode(nextCode) ? "invalid" : "checking");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setMessage("Sign in before submitting your promoter application.");
      return;
    }

    const codeError = validatePromoterCode(normalizedCode);
    if (codeError) {
      setMessage(codeError);
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage("");

    try {
      await applyForPromoter({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        code: normalizedCode,
      }, user.uid);
      setCodeInput("");
      setAvailability("idle");
      event.currentTarget.reset();
      setMessage("Application submitted. An admin can approve or reject it from the Promoters dashboard.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="auth-panel">
        <p className="form-message">Checking account...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="promoter-application-layout">
        <div className="auth-panel">
          <p className="eyebrow">Sign in required</p>
          <h2>Create an account to apply.</h2>
          <p className="form-message">Promoter applications are linked to a customer account so codes and commissions can be tracked correctly.</p>
        </div>
        <AuthForms />
      </section>
    );
  }

  return (
    <section className="promoter-application-layout">
      <div className="auth-panel">
        <p className="eyebrow">Application</p>
        <h2>Choose your promoter code.</h2>
        <form onSubmit={submit}>
          <label>
            Name
            <input name="name" defaultValue={[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user.displayName || ""} required />
          </label>
          <label>
            Email
            <input name="email" type="email" defaultValue={profile?.email ?? user.email ?? ""} required />
          </label>
          <label>
            Preferred code
            <input
              name="code"
              minLength={4}
              onChange={(event) => updateCode(event.currentTarget.value)}
              placeholder="KROON10"
              required
              value={codeInput}
            />
          </label>
          <p className={`form-message availability-${availability}`}>{availabilityText[availability]}</p>
          <button className="button button-dark" disabled={submitting || availability === "checking" || availability === "taken" || availability === "invalid"} type="submit">
            {submitting ? "Submitting..." : "Submit application"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </div>

      <aside className="account-grid promoter-application-status">
        <article>
          <p className="eyebrow">Your status</p>
          <h2>{approvedApplication ? "Approved promoter" : applications.length ? "Application received" : "No application yet"}</h2>
          {approvedApplication ? (
            <>
              <p>Your code is {approvedApplication.code} with {approvedApplication.discountPercent}% off for referred customers.</p>
              <Link className="text-link" href={buildReferralLink(approvedApplication.code, origin)}>
                Open referral link
              </Link>
            </>
          ) : (
            <p>Submitted applications appear here after Firebase saves them.</p>
          )}
        </article>
        {applications.map((application) => (
          <article key={application.id}>
            <p className="eyebrow">{statusText(application.status)}</p>
            <h2>{application.code}</h2>
            <p>{application.discountPercent}% discount configured by admin.</p>
          </article>
        ))}
      </aside>
    </section>
  );
}
