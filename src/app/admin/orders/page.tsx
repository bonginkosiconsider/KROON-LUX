import { compactDate, formatMoney } from "@/lib/format";
import { listAdminOrders } from "@/server/admin/dashboard";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Fulfillment</p>
          <h1>Orders</h1>
        </div>
        <span>{orders.length} loaded</span>
      </header>

      <section className="admin-panel">
        <div className="admin-table">
          <div className="admin-table-row admin-table-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Items</span>
            <span>Total</span>
            <span>Date</span>
          </div>
          {orders.length > 0 ? (
            orders.map((order) => (
              <div className="admin-table-row" key={order.id}>
                <span>{order.orderNumber}</span>
                <span>{order.customerFirstName} {order.customerLastName}</span>
                <span>{order.status} / {order.paymentStatus}</span>
                <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                <span>{formatMoney(order.totalCents)}</span>
                <span>{compactDate(order.createdAt)}</span>
              </div>
            ))
          ) : (
            <p className="empty-catalog">No orders have been created yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

