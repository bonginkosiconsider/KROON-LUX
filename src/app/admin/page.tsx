import { compactDate, formatMoney } from "@/lib/format";
import { getAdminDashboard } from "@/server/admin/dashboard";

export default async function AdminDashboard() {
  const dashboard = await getAdminDashboard();
  const metrics = dashboard.metrics;

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Operations</p>
          <h1>Good morning, {dashboard.admin.firstName}.</h1>
        </div>
        <span>Server-authorized admin session</span>
      </header>

      <section className="admin-grid" aria-label="Commerce overview">
        <article>
          <p className="eyebrow">Revenue / this month</p>
          <strong>{formatMoney(metrics.revenueCents)}</strong>
          <span>Paid orders only</span>
        </article>
        <article>
          <p className="eyebrow">Orders</p>
          <strong>{metrics.orders}</strong>
          <span>This month</span>
        </article>
        <article>
          <p className="eyebrow">Customers</p>
          <strong>{metrics.customers}</strong>
          <span>New this month</span>
        </article>
        <article>
          <p className="eyebrow">Products</p>
          <strong>{metrics.activeProducts}</strong>
          <span>Active catalog</span>
        </article>
        <article>
          <p className="eyebrow">Low stock</p>
          <strong>{metrics.lowStock}</strong>
          <span>Variants needing attention</span>
        </article>
        <article>
          <p className="eyebrow">Referral payout</p>
          <strong>{formatMoney(metrics.pendingCommissionCents)}</strong>
          <span>{metrics.pendingCommissions} pending commissions</span>
        </article>
      </section>

      <section className="admin-panel">
        <div className="section-heading tight">
          <div>
            <p className="eyebrow">Recent orders</p>
            <h2>Fulfillment queue</h2>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span>Date</span>
          </div>
          {dashboard.recentOrders.length > 0 ? (
            dashboard.recentOrders.map((order) => (
              <div className="admin-table-row" key={order.id}>
                <span>{order.orderNumber}</span>
                <span>{order.customerEmail}</span>
                <span>{order.status}</span>
                <span>{formatMoney(order.totalCents)}</span>
                <span>{compactDate(order.createdAt)}</span>
              </div>
            ))
          ) : (
            <p className="empty-catalog">No orders have been placed yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

