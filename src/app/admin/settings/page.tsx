import { AdminSettingsClient } from "@/components/firebase/AdminSettingsClient";

export default function AdminSettingsPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Store settings</h1>
        </div>
        <span>Changes save to Firebase</span>
      </header>
      <AdminSettingsClient />
    </>
  );
}

