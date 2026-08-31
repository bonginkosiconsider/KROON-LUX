"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  buildReferralLink,
  createPromoter,
  normalizePromoterCode,
  subscribePromoters,
  subscribeReferralActivities,
  updatePromoterDiscount,
  updatePromoterStatus,
  type Promoter,
  type PromoterStatus,
  type ReferralActivity,
} from "@/services/firebase-referrals";

type PromoterMetrics = {
  activity: number;
  visits: number;
  codeEntries: number;
  conversions: number;
  sales: number;
  discounts: number;
};

const emptyMetrics: PromoterMetrics = {
  activity: 0,
  visits: 0,
  codeEntries: 0,
  conversions: 0,
  sales: 0,
  discounts: 0,
};

const statusLabels: Record<PromoterStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paused: "Paused",
  rejected: "Rejected",
};

function money(value: number) {
  return `R ${value.toFixed(2)}`;
}

function metricsByPromoter(activities: ReferralActivity[]) {
  return activities.reduce((map, activity) => {
    if (!activity.promoterId) return map;
    const current = map.get(activity.promoterId) ?? { ...emptyMetrics };
    current.activity += 1;
    if (activity.type === "visit") current.visits += 1;
    if (activity.type === "code_entry") current.codeEntries += 1;
    if (activity.type === "checkout") {
      current.conversions += 1;
      current.sales += activity.orderTotal ?? 0;
      current.discounts += activity.discountAmount ?? 0;
    }
    map.set(activity.promoterId, current);
    return map;
  }, new Map<string, PromoterMetrics>());
}

function PromoterStatusControls({ promoter, onMessage }: { promoter: Promoter; onMessage: (message: string) => void }) {
  async function saveStatus(status: PromoterStatus) {
    try {
      await updatePromoterStatus(promoter, status);
      onMessage(`${promoter.code} marked ${statusLabels[status].toLowerCase()}.`);
    } catch {
      onMessage("Promoter status could not be updated.");
    }
  }

  return (
    <div className="admin-action-row">
      {promoter.status === "pending" ? (
        <>
          <button className="button button-primary compact-button" type="button" onClick={() => saveStatus("approved")}>
            Approve
          </button>
          <button className="button button-secondary compact-button" type="button" onClick={() => saveStatus("rejected")}>
            Reject
          </button>
        </>
      ) : null}
      <select aria-label={`Status for ${promoter.name}`} value={promoter.status} onChange={(event) => saveStatus(event.target.value as PromoterStatus)}>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="paused">Paused</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  );
}

export function AdminPromotersClient() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [activities, setActivities] = useState<ReferralActivity[]>([]);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  useEffect(() => subscribePromoters(setPromoters), []);
  useEffect(() => subscribeReferralActivities(setActivities), []);

  const metrics = useMemo(() => metricsByPromoter(activities), [activities]);
  const pending = promoters.filter((promoter) => promoter.status === "pending");
  const approved = promoters.filter((promoter) => promoter.status === "approved");
  const totals = promoters.reduce((summary, promoter) => {
    const item = metrics.get(promoter.id) ?? emptyMetrics;
    return {
      sales: summary.sales + item.sales,
      conversions: summary.conversions + item.conversions,
      activity: summary.activity + item.activity,
    };
  }, { sales: 0, conversions: 0, activity: 0 });
  const sortedPromoters = [
    ...pending,
    ...promoters.filter((promoter) => promoter.status !== "pending"),
  ];

  async function addPromoter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAdding(true);
    setMessage("");

    try {
      await createPromoter({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        code: String(form.get("code") ?? ""),
        discountPercent: Number(form.get("discountPercent") ?? 10),
      });
      event.currentTarget.reset();
      setMessage("Promoter added and approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promoter could not be saved.");
    } finally {
      setAdding(false);
    }
  }

  async function saveDiscount(promoter: Promoter, value: string) {
    const discountPercent = Number(value);
    if (!Number.isFinite(discountPercent) || discountPercent === promoter.discountPercent) return;

    try {
      await updatePromoterDiscount(promoter.id, discountPercent);
      setMessage(`${promoter.code} discount updated.`);
    } catch {
      setMessage("Discount could not be updated.");
    }
  }

  async function copyReferralLink(code: string) {
    try {
      await navigator.clipboard.writeText(buildReferralLink(code, origin));
      setMessage("Referral link copied.");
    } catch {
      setMessage("Referral link could not be copied.");
    }
  }

  return (
    <div className="admin-products-workspace">
      <section className="admin-grid">
        <article>
          <p className="eyebrow">Pending</p>
          <strong>{pending.length}</strong>
          <span>Applications waiting</span>
        </article>
        <article>
          <p className="eyebrow">Approved</p>
          <strong>{approved.length}</strong>
          <span>Active promoters</span>
        </article>
        <article>
          <p className="eyebrow">Conversions</p>
          <strong>{totals.conversions}</strong>
          <span>Referral orders</span>
        </article>
        <article>
          <p className="eyebrow">Referral sales</p>
          <strong>{money(totals.sales)}</strong>
          <span>{totals.activity} tracked events</span>
        </article>
      </section>

      <section className="admin-dashboard-columns">
        <section className="admin-panel">
          <div className="section-heading tight">
            <div>
              <p className="eyebrow">Invite</p>
              <h2>Add promoter</h2>
            </div>
          </div>
          <form className="admin-form" onSubmit={addPromoter}>
            <div className="form-grid">
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Promo code
                <input name="code" minLength={4} onChange={(event) => { event.currentTarget.value = normalizePromoterCode(event.currentTarget.value); }} required />
              </label>
              <label>
                Discount (%)
                <input name="discountPercent" type="number" min="0" max="100" step="1" defaultValue="10" required />
              </label>
            </div>
            <button className="button button-primary" disabled={adding}>
              {adding ? "Adding..." : "Add promoter"}
            </button>
          </form>
        </section>

        <section className="admin-panel">
          <div className="section-heading tight">
            <div>
              <p className="eyebrow">Review</p>
              <h2>Applications</h2>
            </div>
            <span>{pending.length} pending</span>
          </div>
          <div className="admin-activity-list">
            {pending.length ? pending.map((promoter) => (
              <div key={promoter.id}>
                <span>
                  <strong>{promoter.name}</strong>
                  <small>{promoter.email} requested {promoter.code}</small>
                </span>
                <PromoterStatusControls promoter={promoter} onMessage={setMessage} />
              </div>
            )) : <p className="empty-catalog">New promoter applications will appear here.</p>}
          </div>
        </section>
      </section>

      <section className="admin-panel">
        <div className="section-heading tight">
          <div>
            <p className="eyebrow">Promoters</p>
            <h2>Referral performance</h2>
          </div>
          <span>{promoters.length} total</span>
        </div>

        <div className="admin-table">
          <div className="admin-table-row admin-table-head admin-promoter-row">
            <span>Promoter</span>
            <span>Code and link</span>
            <span>Discount</span>
            <span>Activity</span>
            <span>Sales</span>
            <span>Status</span>
          </div>
          {sortedPromoters.length ? sortedPromoters.map((promoter) => {
            const item = metrics.get(promoter.id) ?? emptyMetrics;
            const link = buildReferralLink(promoter.code, origin);

            return (
              <div className="admin-table-row admin-promoter-row" key={promoter.id}>
                <span>
                  <strong>{promoter.name}</strong>
                  <small>{promoter.email}</small>
                </span>
                <span className="promoter-code-stack">
                  <code>{promoter.code}</code>
                  <small>{link}</small>
                  <button className="text-button" type="button" onClick={() => copyReferralLink(promoter.code)}>
                    Copy link
                  </button>
                </span>
                <span>
                  <input
                    aria-label={`Discount for ${promoter.name}`}
                    className="promoter-discount-input"
                    defaultValue={promoter.discountPercent}
                    key={`${promoter.id}-${promoter.discountPercent}`}
                    max="100"
                    min="0"
                    onBlur={(event) => saveDiscount(promoter, event.currentTarget.value)}
                    step="1"
                    type="number"
                  />
                  <small>Percent off at checkout</small>
                </span>
                <span>
                  {item.activity}
                  <small>{item.visits} visits, {item.codeEntries} code entries</small>
                </span>
                <span>
                  {money(item.sales)}
                  <small>{item.conversions} conversions, {money(item.discounts)} discounts</small>
                </span>
                <span>
                  <PromoterStatusControls promoter={promoter} onMessage={setMessage} />
                </span>
              </div>
            );
          }) : <p className="empty-catalog">Add or approve a promoter to begin tracking referrals.</p>}
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
    </div>
  );
}
