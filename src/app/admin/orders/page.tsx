import { AdminOrdersClient } from "@/components/firebase/AdminOrdersClient";

export default function AdminOrdersPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Fulfillment</p>
          <h1>Orders</h1>
        </div>
        <span>Real-time fulfillment</span>
      </header>

      <AdminOrdersClient />
    </>
  );
}

