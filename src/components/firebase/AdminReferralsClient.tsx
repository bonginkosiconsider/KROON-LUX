"use client";

import { FormEvent, useEffect, useState } from "react";
import { createReferral, subscribeReferrals, updateReferralStatus, type Referral } from "@/services/firebase-referrals";

export function AdminReferralsClient() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  useEffect(() => subscribeReferrals(setReferrals), []);

  async function addReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAdding(true); setMessage("");
    try {
      await createReferral({ name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), code: String(form.get("code")).trim().toUpperCase(), status: "active", commissionRate: Number(form.get("commissionRate")) });
      event.currentTarget.reset();
      setMessage("Referral partner added.");
    } catch { setMessage("Referral partner could not be saved. Confirm your Firebase admin role and rules are deployed."); }
    finally { setAdding(false); }
  }

  return <div className="admin-products-workspace"><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow">Add partner</p><h2>New referral</h2></div></div><form className="admin-form" onSubmit={addReferral}><div className="form-grid"><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Referral code<input name="code" required /></label><label>Commission rate (%)<input name="commissionRate" type="number" min="0" max="100" step="0.1" defaultValue="10" required /></label></div>{message ? <p className="form-message">{message}</p> : null}<button className="button button-primary" disabled={adding}>{adding ? "Adding…" : "Add partner"}</button></form></section><section className="admin-panel"><div className="section-heading tight"><div><p className="eyebrow">Partners</p><h2>Referral performance</h2></div><span>{referrals.length} total</span></div><div className="admin-table"><div className="admin-table-row admin-table-head admin-referral-row"><span>Partner</span><span>Code</span><span>Visits</span><span>Sales</span><span>Commission</span><span>Status</span></div>{referrals.length ? referrals.map((referral) => <div className="admin-table-row admin-referral-row" key={referral.id}><span><strong>{referral.name}</strong><small>{referral.email}</small></span><span><code>{referral.code}</code></span><span>{referral.clicks}</span><span>{referral.conversions}</span><span>R {referral.commissionTotal.toFixed(2)} <small>{referral.commissionRate}% rate</small></span><span><select aria-label={`Status for ${referral.name}`} value={referral.status} onChange={(event) => updateReferralStatus(referral.id, event.target.value as Referral["status"]).catch(() => setMessage("Status could not be updated."))}><option value="active">Active</option><option value="paused">Paused</option></select></span></div>) : <p className="empty-catalog">Add your first referral partner to begin tracking activity.</p>}</div></section></div>;
}
