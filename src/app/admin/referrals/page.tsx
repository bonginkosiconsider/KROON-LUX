import { LazyAdminWorkspace } from "@/components/firebase/LazyAdminWorkspace";

export default function AdminReferralsPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1>Referrals</h1>
        </div>
        <span>Partner programme</span>
      </header>
      <LazyAdminWorkspace workspace="referrals" />
    </>
  );
}

