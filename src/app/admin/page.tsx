import { AdminDashboardClient } from "@/components/firebase/AdminDashboardClient";

export default function AdminDashboard() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome back.</h1>
        </div>
        <span>Live store overview</span>
      </header>

      <AdminDashboardClient />
    </>
  );
}

