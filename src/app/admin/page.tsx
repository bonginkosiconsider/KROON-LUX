import { AdminDashboardClient } from "@/components/firebase/AdminDashboardClient";

export default function AdminDashboard() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow gold">Operations</p>
          <h1>Operations dashboard.</h1>
        </div>
        <span>Firebase-admin protected</span>
      </header>

      <AdminDashboardClient />
    </>
  );
}

